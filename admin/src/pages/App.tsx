import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';

import { HomePage } from './HomePage';
import { WidgetPreviewPage } from './WidgetPreviewPage';

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="widget-preview" element={<WidgetPreviewPage />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };
