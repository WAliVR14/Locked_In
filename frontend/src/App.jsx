import Login from './pages/Login';

function App() {
  return (
    <Login onLoginSuccess={() => console.log('Login successful!')} />
  );
}

export default App;