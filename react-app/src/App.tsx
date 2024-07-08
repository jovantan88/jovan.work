import { useEffect } from 'react';
import Start from './components/Start.tsx';
import Introduction from './components/Introduction.tsx';
import MySkills from './components/MySkills.tsx';
import Email from './components/Email.tsx';
import Something from './components/Something.tsx';
// import Education from './components/Education.tsx';
// import Skills from './components/Skills.tsx';
// import Experience_old from './components/Experience_old.tsx';
import Projects from './components/Projects.tsx';
import Contact from './components/Contact.tsx';
// import BsFoot from './components/BsFoot.tsx';
import './App.css';
import './App.js';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { ReactLenis, useLenis } from 'lenis/react';

function App() {
    useLenis(({ scroll }) => {
        console.log('scroll position:', scroll);
    });

    useEffect(() => {
        AOS.init({
            // Global settings:
            disable: false, // accepts following values: 'phone', 'tablet', 'mobile', boolean, expression or function
            startEvent: 'DOMContentLoaded', // name of the event dispatched on the document, that AOS should initialize on
            initClassName: 'aos-init', // class applied after initialization
            animatedClassName: 'aos-animate', // class applied on animation
            useClassNames: false, // if true, will add content of `data-aos` as classes on scroll
            disableMutationObserver: false, // disables automatic mutations' detections (advanced)
            debounceDelay: 50, // the delay on debounce used while resizing window (advanced)
            throttleDelay: 99, // the delay on throttle used while scrolling the page (advanced)

            // Settings that can be overridden on per-element basis, by `data-aos-*` attributes:
            offset: 150, // offset (in px) from the original trigger point
            delay: 0, // values from 0 to 3000, with step 50ms
            duration: 400, // values from 0 to 3000, with step 50ms
            easing: 'ease', // default easing for AOS animations
            once: false, // whether animation should happen only once - while scrolling down
            mirror: false, // whether elements should animate out while scrolling past them
            anchorPlacement: 'center-bottom', // defines which position of the element regarding to window should trigger the animation
        });
    }, []);

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Dancing+Script&family=Zen+Loop&display=swap"
                rel="stylesheet"
            ></link>
            <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
            <link
                rel="stylesheet"
                href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
                integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM"
            />
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,100..700;1,100..700&display=swap');
            </style>
            <ReactLenis root>
                <Start />
                <Introduction />
                <MySkills />
                <Projects />
                <Contact />
                <Email />
                {/* <Education />
                <Skills />
                <Experience_old /> */}
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
                            <p className="footerTextLast text-center">&copy; 2024 Jovan Tan <img className="mx-1 img-fluid footerlogo" src="JT.png"></img></p>
                        </footer>
                    </div>
                </div>
            </ReactLenis>
        </>
    );
}

export default App;
