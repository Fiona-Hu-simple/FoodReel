import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';
import './AppHeader.css';

type AppHeaderProps = { name: string; onLogout: () => void; onOpenCalendar: () => void };

// 显示用户名和品牌标题，提供退出登录与打开日历的入口。
export function AppHeader({ name, onLogout, onOpenCalendar }: AppHeaderProps) {
  return (
      <header className="app-header">
        <div className="app-heading">
          <button className="font-filmstrip app-title" type="button" onClick={onLogout}>{name.toUpperCase()}</button>
          <Sparkles className="app-title-icon" aria-hidden="true" />
          <div className="font-filmstrip app-title title-secondary">FOOD</div>
        </div>
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={onOpenCalendar}
          className="btn-calendar-fab"
          aria-label="打开饮食日历"
        >
          <Calendar size={24} strokeWidth={2.2} />
        </motion.button>
      </header>
  );
}
