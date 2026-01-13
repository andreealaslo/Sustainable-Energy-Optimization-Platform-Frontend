# Sustainable-Energy-Optimization-Platform-Frontend

### **Microfrontend Architecture**
The frontend is built as a Microfrontend Architecture using Webpack Module Federation:
- **Shell App (Host)**: Manages the main layout, user session, WebSocket connection, and global notifications.
- **Dashboard App (Remote)**: An isolated component that provides energy visualizations (Recharts) and data entry forms.
