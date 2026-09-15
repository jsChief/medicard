# MediCard - Patient Cards Tracking App

## Suggested Screens

### Authentication
- [x] **Login Page** - Hospital staff login with email/password
- [x] **Register Page** - Hospital account creation
- [x] **Forgot Password** - Password reset flow
- [x] **Email Verification** - Verify hospital email

### Dashboard (Authenticated)
- [x] **Dashboard Home** - Overview stats, recent patients, quick actions
- [x] **Patient List** - Searchable, filterable table of all patient cards
- [x] **Patient Detail View** - Full patient card with medical history, medications, allergies
- [x] **Add Patient** - Form to create new patient card
- [x] **Edit Patient** - Form to update patient information

### Patient Card Management
- [ ] **Patient Card Form** - Multi-step form (Personal Info, Medical History, Emergency Contacts, Insurance)
- [ ] **Patient Search** - Advanced search with filters (name, DOB, MRN, condition, date range)
- [ ] **Patient Import/Export** - CSV/Excel import/export functionality
- [ ] **Bulk Actions** - Archive, delete, export multiple patients

### Hospital Settings
- [ ] **Hospital Profile** - Edit hospital info, logo, address
- [ ] **Staff Management** - Invite/remove staff, assign roles (admin, doctor, nurse, receptionist)
- [ ] **Department Management** - Create/edit departments/wards
- [ ] **Audit Logs** - Track all patient data access/modifications

### Reports & Analytics
- [ ] **Patient Statistics** - Admissions, discharges, occupancy rates
- [ ] **Condition Reports** - Common diagnoses, trends
- [ ] **Staff Activity** - Who accessed/modified what

### UI Components Needed
- [x] Layout/Navigation (Sidebar, Header, Breadcrumbs)
- [x] Data Table with sorting, pagination, filters
- [x] Modal/Dialog system
- [x] Form components (Input, Select, DatePicker, MultiSelect)
- [x] Toast/Notification system
- [x] Loading states & Skeletons
- [x] Empty states
- [x] Confirmation dialogs

### Technical Setup
- [x] Routing setup (React Router)
- [x] State management (Context/Zustand/Redux)
- [x] API service layer
- [x] Authentication context & protected routes
- [x] Form validation (Zod + React Hook Form)
- [x] Theme/Styling system