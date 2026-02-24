import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route } from 'react-router-dom';
import { ThemeProvider, FeedbackProvider } from '@erp/common';
import { Layout } from '@components/layout/Layout';
import { HomePage } from '@pages/HomePage';
import { ProductsPage } from '@pages/ProductsPage';
import { ServicesPage } from '@pages/ServicesPage';
import { PricingPage } from '@pages/PricingPage';
import { ContactPage } from '@pages/ContactPage';
import './styles/index.css'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Layout />}>
      <Route index element={<HomePage />} />
      <Route path="products" element={<ProductsPage />} />
      <Route path="services" element={<ServicesPage />} />
      <Route path="pricing" element={<PricingPage />} />
      <Route path="contact" element={<ContactPage />} />
    </Route>
  )
);

function App() {
  return (
    <ThemeProvider>
      <FeedbackProvider>
        <RouterProvider router={router} />
      </FeedbackProvider>
    </ThemeProvider>
  );
}

export default App;
