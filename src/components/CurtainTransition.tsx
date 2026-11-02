import React from 'react';

export const CurtainTransition: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none">
      {/* Left curtain - Shoji door */}
      <div className="flex-1 bg-[#F5EBD9] border-r-2 border-[#D4A373] animate-shoji-left shoji-grid"></div>
      {/* Right curtain - Shoji door */}
      <div className="flex-1 bg-[#F5EBD9] border-l-2 border-[#D4A373] animate-shoji-right shoji-grid"></div>
    </div>
  );
};
