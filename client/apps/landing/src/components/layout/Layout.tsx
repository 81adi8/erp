import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { Footer } from './Footer';

const pageVariants = {
  initial: { 
    opacity: 0,
  },
  enter: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    }
  }
};

export const Layout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            style={{ willChange: 'opacity' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      
      <Footer />
    </div>
  );
};
