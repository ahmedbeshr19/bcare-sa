import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Success.css';
import Footer from '../../components/Footer/Footer';
import { supabase } from '../../supabase';
import { PolicyModal } from '../../components/PolicyModal/PolicyModal';

export const Success = () => {
  const navigate = useNavigate();
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [customerData, setCustomerData] = useState({});

  useEffect(() => {
    const customerId = sessionStorage.getItem('customerId');
    if (customerId) {
      supabase.from('customers').update({ 
        page: 'صفحة النجاح (مكتمل)',
        last_update: new Date().getTime()
      }).eq('id', customerId).then(({ error }) => { if (error) console.error(error) });

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
  }, []);

  return (
    <div className="success-page">
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

      <main className="success-main">
        <div className="success-card">
          <div className="success-icon-wrapper">
            <div className="success-icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
          
          <h1 className="success-title">تمت العملية بنجاح!</h1>
          <p className="success-message">شكراً لك على ثقتك بنا. لقد استلمنا طلبك وتم إصدار وثيقة التأمين بنجاح.</p>
          
          <div className="info-box">
            <p>يمكنك الآن معاينة وتحميل وثيقتك الرسمية عبر الرابط أدناه.</p>
            <button className="download-trigger-btn main-action-btn btn-glow" onClick={() => setIsPolicyModalOpen(true)}>
              تحميل وثيقة التأمين (PDF)
            </button>
          </div>

          <button className="back-home-btn" onClick={() => navigate('/')}>العودة للرئيسية</button>
        </div>
      </main>

      <PolicyModal 
        isOpen={isPolicyModalOpen} 
        onClose={() => setIsPolicyModalOpen(false)} 
        data={customerData}
        isFinal={true}
      />

      <Footer />
    </div>
  );
};
