
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLocation } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";
import { useAuth } from "@/context/AuthContext";

const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const isDashboard = location.pathname.startsWith("/dashboard");
 

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        {(isDashboard ) && user && (
          <DashboardSidebar />
        )}
        <main className={`flex-1 ${(isDashboard) ? 'ml-0 sm:ml-64' : ''}`}>
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
