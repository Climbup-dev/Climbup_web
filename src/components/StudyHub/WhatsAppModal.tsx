import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import WhatsAppLinking from "../WhatsAppLinking";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose }) => {
  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 12, 27, 0.8)",
          backdropFilter: "blur(8px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}
        onClick={handleClose}
      >
        <motion.div
          className="modal-content"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "linear-gradient(160deg, rgba(15, 23, 42, 0.95) 0%, rgba(7, 15, 30, 0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px",
            width: "100%",
            maxWidth: "420px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
            overflow: "hidden"
          }}
        >
          {/* Body - Replaced with the new OTP Component */}
          <div style={{ padding: "0" }}>
             <WhatsAppLinking />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
