import React from 'react';
import Typewriter from 'typewriter-effect';
import styled, { keyframes } from 'styled-components';

const HomeContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  &::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-image: url("/engineer_block.jpeg");
    background-position: center;
    background-size: cover;
    box-shadow: inset 0 0 0 1000px rgba(0, 0, 0, 0.7);
    background-repeat: no-repeat;
  }
`;

const BackgroundImage = styled.div`
  @media (max-width: 650px) {
    background-image: url("/engineer_block_mobile.jpeg");
    background-position: center center;
    background-size: cover;
    box-shadow: inset 0 0 0 1000px rgba(0, 0, 0, 0.7);
    background-repeat: no-repeat;
    background-attachment: fixed;
    height: 100%;
    width: 100%;
  }
`;

const TextDiv = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
`;

const TypewriterText = styled.h1`
  color: #fff;
  font-family: "Roboto Mono", monospace;
`;

const SubText = styled.h2`
  font-size: 1.25rem;
  color: #fff;
  font-family: "Roboto Mono", monospace;
`;

const fadeUp = keyframes`
  from {
    opacity: 0;
    // transform: translateY(20px);
  }
  to {
    opacity: 1;
    // transform: translateY(0);
  }
`;

const ScrollLinkContainer = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: opacity 0.3s;

  & > * {
    animation: ${fadeUp} 1s ease-in-out;
  }

  &:hover {
    opacity: 0.5;
    cursor: pointer;
  }
`;

const ScrollLinkText = styled.div`
  color: #fff;
  text-decoration: none;
  font: normal 400 20px/1 'Josefin Sans', sans-serif;
  letter-spacing: 0.1em;
  margin-bottom: 10px; /* Adjust this value to move the text up or down */
`;

const ScrollLinkArrow = styled.span`
  width: 24px;
  height: 24px;
  border-left: 1px solid #ffffff;
  border-bottom: 1px solid #fff;
  transform: rotate(-45deg);
  box-sizing: border-box;
`;

const Start: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <HomeContainer id="01">
      <BackgroundImage className="fluid"></BackgroundImage>
      <TextDiv>
        <TypewriterText className="josefin-sans">
          <Typewriter
            onInit={(typewriter) => {
              typewriter
                .typeString("Jovan.work")
                .pauseFor(1500)
                .deleteChars(5)
                .typeString("'s Portfolio")
                .start();
            }}
          />
        </TypewriterText>
        <SubText className="josefin-sans">
          Student | RL Enthusiast | Full Stack Developer
        </SubText>
      </TextDiv>
      <ScrollLinkContainer onClick={() => scrollToSection('02')}>
        <ScrollLinkText>Scroll</ScrollLinkText>
        <ScrollLinkArrow />
      </ScrollLinkContainer>
    </HomeContainer>
  );
};
export default Start;
