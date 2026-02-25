import { TabBar } from '../tabs/TabBar';
import { TabContent } from '../tabs/TabContent';
import './CenterPanel.css';

export function CenterPanel() {
  return (
    <div className="center-panel">
      <TabBar />
      <div className="center-panel__content">
        <TabContent />
      </div>
    </div>
  );
}
