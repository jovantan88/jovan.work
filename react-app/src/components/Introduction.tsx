import { useState, useEffect } from 'react';
import styled from 'styled-components';

function Introduction() {
    const [padding, setPadding] = useState(calculatePadding(window.innerWidth));

    useEffect(() => {
        const handleResize = () => {
            setPadding(calculatePadding(window.innerWidth));
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
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
        overflow: hidden;
        width: 100%;
        height: 100vh;
    `;

    const StyledH1 = styled.h1`
        font-size: 3rem;
        margin-bottom: 50px;
    `;

    const StyledP = styled.p`
        font-size: 1.3rem;
        padding: 0px ${padding}px;
        margin: 0;
    `;

    const HeadShot = styled.img`
        width: 200px;
        height: 200px;
        border-radius: 50%;
        margin-bottom: 50px;
    `;

    return (
        <IntroductionDiv className="single-section">
            <HeadShot src="/headshot.jpg" className="rounded-circle mx-auto d-block" data-aos="slide-up"></HeadShot>
            <StyledH1 className="text-center text-light josefin-sans" data-aos="slide-up">
                Hi, I'm Jovan
            </StyledH1>
            <StyledP className="text-center text-light josefin-sans" data-aos="slide-up">
                I'm 19 this year and currently pursuing a diploma in Applied AI and Analytics. Coding is my passion and I have an interest in web development and reinforcement learning.
            </StyledP>
        </IntroductionDiv>
    );
}

export default Introduction;
