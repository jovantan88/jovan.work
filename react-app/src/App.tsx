import Start from './components/Start.tsx';
import Introduction from './components/Introduction.tsx';
import MySkills from './components/MySkills.tsx';
import Email from './components/Email.tsx';
import Something from './components/Something.tsx';
import Education from './components/Education.tsx';
import Skills from './components/Skills.tsx';
import Experience from './components/Experience.tsx';
// import BsFoot from './components/BsFoot.tsx';
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
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,100..700;1,100..700&display=swap');
            </style>
            <Start />
            <Introduction />
            <MySkills />
            <Education />
            <Email />
            <Skills />
            <Experience />
            <Something />
            <div className="footer">
                <div className="footerText container">
                    <footer className="py-3">
                        <ul className="nav justify-content-center border-bottom pb-3 mb-3">
                            <li className="nav-item"><a href="#01" className="footerText nav-link px-2">Home</a></li>
                            <li className="nav-item"><a href="mailto:jovantanwork@gmail.com" target="_blank" className="footerText nav-link px-2">Email</a></li>
                            <li className="nav-item"><a href="https://github.com/kyourandesu" target="_blank" className="footerText nav-link px-2">Github</a></li>
                            <li className="nav-item"><a href="https://www.linkedin.com/in/jovan-tan-a01143248/" target="_blank" className="footerText nav-link px-2">LinkedIn</a></li>
                            <li className="nav-item"><a href="tel:89020050" target="_blank" className="footerText nav-link px-2">Message</a></li>
                        </ul>
                        <p className="footerTextLast text-center">&copy; 2023 Jovan Tan <img className="mx-1 img-fluid footerlogo" src="JT.png"></img></p>
                    </footer>
                </div>
            </div>
        </>
    )
}

export default App;