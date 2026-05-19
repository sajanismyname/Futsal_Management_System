import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';

const MinimalFooter = () => (
  <footer className="border-t border-hairline">
    <div className="container-page py-4 flex items-center justify-center">
      <p className="text-sm text-steel">
        © {new Date().getFullYear()} Futsal Management System. Built for Nepal.
      </p>
    </div>
  </footer>
);

const MainLayout = () => (
  <div className="min-h-screen flex flex-col bg-white">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <MinimalFooter />
  </div>
);

export default MainLayout;
