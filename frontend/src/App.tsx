import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MediaConverter from './Components/Convert/convert';
import './App.css'
import EditMedia from './Components/EditMedia/EditMedia';

function App() {
  
  return (
    <Router>
      <div className="app-container">
        <Routes> 
          <Route path="/" element={<MediaConverter />} />
          <Route path="/edit-media" element={<EditMedia />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App