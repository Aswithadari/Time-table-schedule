# Centurion University - Class Schedule & Timetable Generation System

A modern, full-featured timetable and class schedule management application designed specifically for Centurion University with drag-and-drop functionality, Excel import/export, and PDF generation capabilities.

**Institution**: Centurion University  
**Owner**: Aswith (aswith@example.com)  
**Last Updated**: November 9, 2025

---

## 📋 Table of Contents

- [Requirements](#requirements)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Scripts](#scripts)
- [Project Architecture](#project-architecture)

---

## 📋 Requirements

### System Requirements

| Requirement | Specification |
|-------------|----------------|
| **Node.js** | v16 or higher |
| **npm** | v7 or higher (or yarn 1.22+) |
| **Browser** | Modern browser with ES6+ support (Chrome, Firefox, Safari, Edge) |
| **Memory** | Minimum 512MB RAM |
| **Disk Space** | 500MB for installation and dependencies |
| **OS** | Windows, macOS, or Linux |

### Functional Requirements

#### 1. **Centurion University Schedule Creation & Management**
   - Create and edit class timetables for all departments
   - Support for multiple academic programs (UG, PG, Diploma, Certification)
   - Define periods (time slots) for scheduling across different shifts
   - Configure departments, courses, and subjects specific to Centurion University
   - Set lab capacities and classroom constraints
   - Support multiple days and time slots for morning, afternoon, and evening batches

#### 2. **Faculty & Resource Management**
   - Manage faculty allocations across departments
   - Track faculty availability and constraints
   - Allocate lab and classroom resources
   - Support for temporary or substitute faculty assignments

#### 3. **Data Management**
   - Import faculty allocation and course data from Excel files (XLSX format)
   - Export official timetables as PDF for Centurion University distribution
   - Store configuration locally using browser storage
   - Persist user preferences, department settings, and historical data

#### 4. **Scheduling Intelligence**
   - Automatic timetable generation algorithm optimized for Centurion University
   - Intelligent collision detection for:
     - Classroom resource conflicts
     - Faculty availability conflicts
     - Lab capacity constraints
   - Faculty availability synchronization across departments
   - Constraint-based scheduling optimization

#### 5. **User Interface**
   - Intuitive drag-and-drop schedule management for administrators
   - Configuration wizard for easy multi-department setup
   - Tab-based navigation for different views and departments
   - Responsive design for desktop and tablet devices
   - Dark mode and light mode themes for comfortable admin work
   - Real-time feedback with toast notifications

#### 6. **Department & Configuration Management**
   - Multiple department configuration
   - Course and subject management
   - Lab capacity and resource settings
   - Faculty allocation and availability tracking
   - Period and time slot setup per department
   - Custom cell type configuration for different class types

#### 7. **Data Export & Reporting**
   - Generate official PDF timetables for Centurion University
   - Export schedules to Excel format for further analysis
   - Support for bulk operations across multiple departments
   - Download capability with progress tracking
   - Report generation for administrative review

### Non-Functional Requirements

- **Performance**: Fast load times and smooth interactions
- **Accessibility**: WCAG compliant UI components
- **Type Safety**: Full TypeScript type coverage
- **Code Quality**: ESLint configured for code standards
- **Responsiveness**: Mobile-friendly and adaptive layouts
- **Scalability**: Support for multiple classes and large datasets
- **Reliability**: Error handling and validation

### Browser Support

- **Chrome**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions
- **Edge**: Latest 2 versions

---

## ✨ Features

- **Centurion University Timetable Management**: Create and manage class schedules for all departments and courses at Centurion University
- **Department Configuration**: Setup for various departments (Engineering, Commerce, Science, Management, etc.)
- **Configuration Wizard**: Step-by-step setup for periods, subjects, faculty resources, and lab capacities
- **Drag & Drop Interface**: Intuitive drag-and-drop scheduling system for easy timetable modifications
- **Data Import/Export**: 
  - Import faculty allocations and course data from Excel files (XLSX)
  - Export official timetables as PDF for distribution to students and faculty
- **Conflict Detection**: Automatic detection of scheduling conflicts (classroom clashes, faculty overlaps, lab resource conflicts)
- **Faculty Synchronization**: Sync faculty schedules across departments and programs
- **Multi-Program Support**: Support for different academic programs (UG, PG, Diploma, etc.)
- **Lab & Classroom Management**: Manage laboratory and classroom capacity constraints
- **Responsive Design**: Works seamlessly on desktop and mobile devices for administrative use
- **Dark Mode Support**: Theme switching between light and dark modes for extended administrative work

---

## 🛠 Technology Stack

### Frontend
- **React** 18.3.1 - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** 5.4.1 - Lightning-fast build tool
- **React Router** 6.26.2 - Client-side routing

### Styling & UI
- **Tailwind CSS** 3.4.11 - Utility-first CSS framework
- **shadcn-ui** - Pre-built, accessible UI components
- **Radix UI** - Headless UI component library
- **Lucide React** - Icon library

### State Management & Forms
- **React Hook Form** 7.53.0 - Form state management
- **Zod** 3.23.8 - Schema validation
- **TanStack React Query** 5.56.2 - Server state management
- **Next Themes** - Theme management

### Interactions & Animations
- **@dnd-kit** - Drag and drop utilities
- **React Resizable Panels** - Resizable UI components
- **Embla Carousel** - Carousel component
- **Tailwind CSS Animate** - Animation utilities

### Data & Export
- **XLSX** 0.18.5 - Excel file handling
- **jsPDF** 3.0.1 - PDF generation
- **Recharts** 2.12.7 - Charting library
- **Date-fns** 3.6.0 - Date manipulation

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

---

## 📁 Project Structure

```
src/
├── components/              # React components
│   ├── AppFooter.tsx
│   ├── AppHeader.tsx
│   ├── Auth.tsx
│   ├── AutoFillPrompt.tsx
│   ├── ClassSubjectsConfig.tsx
│   ├── ConfigWizard.tsx     # Setup wizard
│   ├── DaySelector.tsx
│   ├── DraggableTimetableCell.tsx
│   ├── LabCapacityConfig.tsx
│   ├── MainContent.tsx
│   ├── PeriodSetupForm.tsx
│   ├── TimetableTabs.tsx
│   ├── UploadAllocation.tsx
│   └── ui/                  # shadcn-ui components
├── pages/                   # Page components
│   ├── Index.tsx
│   └── NotFound.tsx
├── hooks/                   # Custom React hooks
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/                     # Utility functions
│   └── utils.ts
├── utils/                   # Helper functions
│   ├── cellTypeUtils.ts
│   ├── collisionDetection.ts
│   ├── configStorage.ts
│   ├── dataStorage.ts
│   ├── excelUtils.ts
│   ├── labSchedulingUtils.ts
│   ├── pdfUtils.ts
│   ├── scrollReset.ts
│   ├── teacherTimetableSync.ts
│   ├── timetableGenerator.ts
│   └── timetableHelpers.ts
├── types/                   # TypeScript type definitions
│   └── downloadTypes.ts
├── App.tsx                  # Main app component
├── main.tsx                 # Entry point
├── App.css
└── index.css
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher) - [Install Node.js](https://nodejs.org/)
- **npm** or **yarn** package manager
- Git for version control

### Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/yourusername/class-schedule.git
   cd class-schedule
   ```

2. **Install dependencies**
   ```sh
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```sh
   npm run dev
   ```

4. **Open in browser**
   - Navigate to `http://localhost:8080`
   - The app will automatically reload on file changes

---

## 💻 Development

### Available Scripts

```sh
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Build with development configuration
npm run build:dev

# Preview production build locally
npm run preview

# Run ESLint for code quality checks
npm run lint
```

### Development Tips

- Use TypeScript strict mode for better type safety
- Follow the existing component structure in `src/components`
- Use Tailwind CSS classes for styling
- Leverage shadcn-ui components for consistent UI
- Store utility functions in the `utils` directory

---

## 🏗 Project Architecture

### Core Features for Centurion University

1. **Timetable Management**
   - Dynamic period setup per department
   - Course and subject configuration aligned with Centurion University programs
   - Lab capacity management with resource tracking
   - Multi-shift support (morning, afternoon, evening batches)

2. **Schedule Generation**
   - Automatic timetable generation algorithm optimized for university constraints
   - Intelligent collision detection system:
     - Classroom availability checks
     - Faculty scheduling conflicts
     - Lab resource constraints
   - Faculty synchronization across departments and programs

3. **Department & Faculty Management**
   - Multi-department support
   - Faculty allocation and availability tracking
   - Resource management (classrooms, labs, equipment)
   - Program-specific configuration (UG, PG, Diploma, etc.)

4. **Data Handling**
   - Excel file import for faculty and course data
   - PDF export for official Centurion University timetables
   - Local storage for configuration persistence
   - Department-specific settings management

5. **User Interface**
   - Drag-and-drop scheduling for efficient timetable management
   - Configuration wizard for administrative setup
   - Responsive tabs and panels for multi-department views
   - Toast notifications for real-time feedback
   - Department-specific dashboards and controls

---

## 🔧 Configuration

- **Tailwind Config**: `tailwind.config.ts`
- **TypeScript Config**: `tsconfig.json`
- **Vite Config**: `vite.config.ts`
- **ESLint Config**: `eslint.config.js`
- **PostCSS Config**: `postcss.config.js`

---

## 📦 Build Output

Production builds are optimized and minified, output to the `dist/` directory:
```sh
npm run build
```

---

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

---

## 📝 License

This project is proprietary and owned by Aswit for Centurion University. All rights reserved.

---

## 📞 Support

For issues, questions, or suggestions related to the Centurion University Timetable System, please contact the administration team or open an issue in the repository.

---

**Developed for Centurion University | Made with ❤️ by Aswit**
#   T i m e - t a b l e - s c h e d u l e  
 #   T i m e - t a b l e - s c h e d u l e  
 