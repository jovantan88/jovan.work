import { useState, useEffect } from 'react';
import styled from 'styled-components';

function Introduction() {
    const [padding, setPadding] = useState(calculatePadding(window.innerWidth));
    const [opacity, setOpacity] = useState(0);
    const [translateY, setTranslateY] = useState(30); // Initial translate value

    useEffect(() => {
        const handleResize = () => {
            setPadding(calculatePadding(window.innerWidth));
        };

        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const maxScroll = window.innerHeight / 2; // Adjust this value to control the speed of fade-in
            const newOpacity = Math.min(scrollTop / maxScroll, 1);
            setOpacity(newOpacity);

            // Calculate translate value based on opacity
            const newTranslateY = 300 * (1 - newOpacity); // Translate from 30px to 0px
            setTranslateY(newTranslateY);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    function calculatePadding(screenWidth:number) {
        var p_width = 800;
        var p_padding = (screenWidth - p_width) / 2;
        return Math.min(Math.max(p_padding, 10), 5000);
    }

    const IntroductionDiv = styled.div`
        background-color: #000000;
        padding: 200px 0px;
    `;

    const StyledH1 = styled.h1`
        opacity: ${opacity};
        transform: translateY(${translateY}px);
        transition: opacity 0.5s ease-out, transform 0.5s ease-out;
    `;

    const StyledP = styled.p`
        padding: 0px ${padding}px;
        margin: 0;
        opacity: ${opacity};
        transform: translateY(${translateY}px);
        transition: opacity 0.5s ease-out, transform 0.5s ease-out;
    `;

    return (
        <IntroductionDiv>
            <StyledH1 className="text-center text-light josefin-sans">
                Hi, I'm Jovan
            </StyledH1>
            <StyledP className="text-center text-light josefin-sans">
                I'm 19 this year and currently pursuing a diploma in Applied AI and Analytics. Coding is my passion and I have an interest in web development and AI related topics, especially reinforcement learning. I'm open to new opportunities and learning new things.
            </StyledP>
        </IntroductionDiv>
    );
}

export default Introduction;
