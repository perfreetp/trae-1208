import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Overview from './pages/Overview'
import Production from './pages/Production'
import Forecast from './pages/Forecast'
import Schedule from './pages/Schedule'
import Alarm from './pages/Alarm'
import Cost from './pages/Cost'
import Review from './pages/Review'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/overview" element={<Overview />} />
      <Route path="/production" element={<Production />} />
      <Route path="/forecast" element={<Forecast />} />
      <Route path="/schedule" element={<Schedule />} />
      <Route path="/alarm" element={<Alarm />} />
      <Route path="/cost" element={<Cost />} />
      <Route path="/review" element={<Review />} />
    </Routes>
  )
}
