import { motion } from "framer-motion";

const Loading = ({ message = "Loading..." }) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        className="glass-card text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div className="relative">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500/30 rounded-full"></div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-transparent border-t-blue-500 rounded-full absolute top-0 left-0 animate-spin"></div>
          </div>
          <p className="text-gray-300 text-base sm:text-lg">{message}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Loading;
