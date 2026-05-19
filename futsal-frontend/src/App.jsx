import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './routes/AppRouter';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#373530',
            border: '1px solid #e3e2e0',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: 'rgba(15,15,15,0.08) 0px 4px 12px 0px',
          },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
