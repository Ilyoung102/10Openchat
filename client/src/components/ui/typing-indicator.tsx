import { motion } from "framer-motion";

export const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-1 p-4 rounded-2xl bg-secondary/30 backdrop-blur-md w-fit border border-white/5">
      <motion.div
        className="w-2 h-2 bg-primary rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.div
        className="w-2 h-2 bg-primary rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
      />
      <motion.div
        className="w-2 h-2 bg-primary rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  );
};
