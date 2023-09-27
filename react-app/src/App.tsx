import Start from './components/Start.tsx';
import Email from './components/Email.tsx';
import Something from './components/Something.tsx';
import './App.css';

function App() {
    return (
        <>
            <link href="https://fonts.googleapis.com/css2?family=Dancing+Script&family=Zen+Loop&display=swap" rel="stylesheet"></link>
            <link
                rel="stylesheet"
                href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
                integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM"
            />
            <Email />
            <Start />
            <Something />
            
        </>
    )
}

export default App;