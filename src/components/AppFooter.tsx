
const AppFooter = () => {
  return (
    <footer className="w-full border-t border-teal-200/30 mt-12 shadow-elegant bg-gradient-to-r from-purple-700 via-teal-600 to-purple-700">
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* Branding */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <span className="text-lg font-bold text-purple-700">CU</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">Centurion University</span>
                <span className="text-xs text-white/90">Schedule Management</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-white">Quick Links</h3>
            <div className="flex flex-col gap-1 text-xs">
              <a href="#" className="text-white/90 hover:text-white transition-colors">Documentation</a>
              <a href="#" className="text-white/90 hover:text-white transition-colors">Support</a>
              <a href="#" className="text-white/90 hover:text-white transition-colors">Administration</a>
            </div>
          </div>

          {/* Information */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-white">Information</h3>
            <p className="text-xs text-white/90">
              Advanced timetable management system designed for Centurion University administration.
            </p>
          </div>
        </div>

        <div className="border-t border-teal-400/30 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs text-white/90 select-none">
              &copy; {new Date().getFullYear()} Centurion University. All Rights Reserved.
            </p>
            <p className="text-xs text-white/80 select-none">
              Developed by: <span className="text-white font-semibold">Aswit</span>
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-white/90 select-none">
              Version 1.0.0 | System Status: <span className="text-green-100 font-semibold">Operational</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
