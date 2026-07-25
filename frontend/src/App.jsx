import { Navigate, Outlet, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DustProvider } from './context/DustContext'
import Splash from './pages/Splash'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import HowItWorks from './pages/HowItWorks'
import OnboardingWelcome from './pages/OnboardingWelcome'
import ProfileScreen from './pages/ProfileScreen'
import Matches from './pages/Matches'
import Moves from './pages/Moves'
import NotificationsPage from './pages/NotificationsPage'
import AppShell from './components/AppShell'

function ProtectedRoute({ children }) {
  const { isAuthenticated, booting } = useAuth()
  if (booting) return <Splash />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function OnboardingGate() {
  const { profile, booting, isAuthenticated } = useAuth()
  if (booting) return <Splash />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (profile?.onboarding_complete) return <Navigate to="/matches" replace />
  return <Outlet />
}

function ShellGate() {
  const { profile, booting, isAuthenticated } = useAuth()
  if (booting) return <Splash />
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!profile?.onboarding_complete) return <Navigate to="/onboarding" replace />
  return <AppShell />
}

function HomeEntry() {
  const { booting, isAuthenticated, profile } = useAuth()
  if (booting) return <Splash />
  if (!isAuthenticated) return <Landing />
  if (!profile?.onboarding_complete) return <Navigate to="/onboarding" replace />
  return <Navigate to="/matches" replace />
}

function ProfileInShell() {
  const { profile } = useAuth()
  return <ProfileScreen mode={profile?.onboarding_complete ? 'edit' : 'onboarding'} />
}

function RootLayout() {
  return (
    <AuthProvider>
      <DustProvider>
        <Outlet />
      </DustProvider>
    </AuthProvider>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeEntry /> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        path: 'onboarding',
        element: <OnboardingGate />,
        children: [
          { index: true, element: <OnboardingWelcome /> },
          { path: 'steps', element: <ProfileScreen mode="onboarding" /> },
        ],
      },
      {
        element: (
          <ProtectedRoute>
            <ShellGate />
          </ProtectedRoute>
        ),
        children: [
          { path: 'matches', element: <Matches /> },
          { path: 'moves', element: <Moves /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'profile', element: <ProfileInShell /> },
        ],
      },
      { path: 'profile/edit', element: <Navigate to="/profile" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
