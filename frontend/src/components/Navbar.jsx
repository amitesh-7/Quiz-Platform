import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLogOut, FiHome, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardPath = user?.role === 'teacher' ? '/teacher' : '/student';

  return (
    <motion.nav
      className="glass sticky top-0 z-50 mb-6"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to={dashboardPath} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Q</span>
            </div>
            <span className="text-xl font-bold text-white">Quiz Platform</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link 
              to={dashboardPath}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <FiHome className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <div className="flex items-center gap-2 px-3 py-2 glass rounded-lg">
              <FiUser className="w-5 h-5 text-blue-400" />
              <span className="text-gray-300 hidden sm:inline">{user?.name}</span>
              <span className="text-xs px-2 py-1 bg-blue-500/30 rounded-full text-blue-300 capitalize">
                {user?.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 
                         text-red-300 rounded-lg transition-colors"
            >
              <FiLogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
