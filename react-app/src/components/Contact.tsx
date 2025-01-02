import React from 'react';
import styled, { keyframes } from 'styled-components';

const ContactWrapper = styled.div`
  text-align: center;
  padding: 20px;
  background-color: #000000;
  min-height: 50vh; /* Ensure it covers the full viewport height */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Title = styled.h2`
  font-size: 2rem;
  margin-bottom: 10px;
  color: #ffffff;
`;

const Description = styled.p`
  font-size: 1.2rem;
  margin-bottom: 20px;
  color: #cccccc;
`;

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
`;

const EmailButton = styled.a`
  display: inline-block;
  padding: 10px 20px;
  font-size: 1.2rem;
  color: #000000;
  background-color: #ffcc00;
  border: none;
  border-radius: 5px;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: ${bounce} 2s infinite;

  &:hover {
    animation: none;
    background-color: #e6b800;
    transform: translateY(-3px);
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    background-color: #cc9900;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
`;

const Contact: React.FC = () => {
    return (
        <ContactWrapper>
            <div
                data-aos="fade-up"
                data-aos-offset="200"
                data-aos-delay="0"
                data-aos-duration="400"
                data-aos-easing="ease"
                data-aos-mirror="false"
                data-aos-once="false"
                data-aos-anchor-placement="top-bottom">
                <Title>Interested in collaborating with me?</Title>
                <Description>I am always open to new opportunities and collaborations.</Description>
                <EmailButton href="mailto:jovantanwork@gmail.com">Start a conversation</EmailButton>
            </div>
        </ContactWrapper>
    );
};

export default Contact;
