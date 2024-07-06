import { useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import styled from 'styled-components';

// Importing icons
import { CgWebsite } from "react-icons/cg";
import { BsGraphUpArrow } from "react-icons/bs";
import { FaRobot } from "react-icons/fa";
import { FaReact } from "react-icons/fa";
import { IoLogoTableau } from "react-icons/io5";
import { SiFlask } from "react-icons/si";
import { SiPowerbi } from "react-icons/si";
import { FaBootstrap } from "react-icons/fa";
import { RiFirebaseLine } from "react-icons/ri";
import { SiMysql } from "react-icons/si";
import { SiPostgresql } from "react-icons/si";
import { FaCloudflare } from "react-icons/fa";
import { FiFramer } from "react-icons/fi";
import { FaSquarespace } from "react-icons/fa";
import { FaFigma } from "react-icons/fa";
import { SiPandas } from "react-icons/si";
import { SiNumpy } from "react-icons/si";
import { SiPlotly } from "react-icons/si";
import { SiScikitlearn } from "react-icons/si";
import { SiKeras } from "react-icons/si";
import { SiGooglecloud } from "react-icons/si";
import { SiTensorflow } from "react-icons/si";
import { SiPytorch } from "react-icons/si";
import { AiFillOpenAI } from "react-icons/ai";

const OuterDiv = styled.div`
  background-color: #000000;
  border: 0px;
  width: 100%;
`;

const StyledContainer = styled(Container)`
  background-color: #000000;
  padding: 0 2rem;
`;

const StyledColMiddle = styled(Col)`
  @media (max-width: 767px) {
    border-top: 0.5px white solid;
    border-bottom: 0.5px white solid;
    border-left: 0;
    border-right: 0;
  }
  @media (min-width: 768px) {
    border-top: 0;
    border-bottom: 0;
    border-left: 0.5px white solid;
    border-right: 0.5px white solid;
  }
`;

const StyledRow = styled(Row)`
  border: 1px white solid;
  border-radius: 15px;
  display: flex;
  align-items: stretch;
`;

const SkillIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
`;

const SkillTitle = styled.h2`
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const FieldTitle = styled.h3`
  text-align: center;
  margin: 0;
  color: #00EFFF;
  font-weight: bold;
`;

const SkillIcon_sm = styled.div`
  font-size: 1.5rem;
  // font-style: italic;
`;

const Spacing = styled.div`
    margin-top: 1rem;
    background-color: #000000;
    border-top: 0.1px white solid;
    width: 90%;
    margin-left: 5%;
    padding-bottom: 1.5rem;
`;

const SkillsSection = styled.div`
  padding-bottom: 3rem;
`;

function MySkills() {
  useEffect(() => {
    const skillTitles = document.querySelectorAll<HTMLElement>('.SkillTitle');
    let maxHeight = 0;

    skillTitles.forEach((title) => {
      const height = title.offsetHeight;
      if (height > maxHeight) {
        maxHeight = height;
      }
    });

    skillTitles.forEach((title) => {
      title.style.height = `${maxHeight}px`;
    });
  }, []);

  return (
    <OuterDiv>
      <StyledContainer>
        <StyledRow>
          <Col md={4} className="text-light text-center">
            <SkillIcon><CgWebsite className="Skill-Icon" /></SkillIcon>
            <SkillTitle className="SkillTitle text-light josefin-sans">Web Development</SkillTitle>
            <Spacing />
            <SkillsSection>
              <FieldTitle className="josefin-sans">Frameworks</FieldTitle>
              <SkillIcon_sm><FaReact className="Skill-Icon me-3" />React</SkillIcon_sm>
              <SkillIcon_sm><SiFlask className="Skill-Icon me-3" />Flask</SkillIcon_sm>
              <SkillIcon_sm><FaBootstrap className="Skill-Icon me-3" />Bootstrap</SkillIcon_sm>
            </SkillsSection>
            <SkillsSection>
              <FieldTitle className="josefin-sans">Database</FieldTitle>
              <SkillIcon_sm><RiFirebaseLine className="Skill-Icon me-3" />Firebase</SkillIcon_sm>
              <SkillIcon_sm><SiMysql className="Skill-Icon me-3" />MySQL</SkillIcon_sm>
              <SkillIcon_sm><SiPostgresql className="Skill-Icon me-3" />PostgreSQL</SkillIcon_sm>
            </SkillsSection>
            <SkillsSection>
              <FieldTitle className="josefin-sans">CDN</FieldTitle>
              <SkillIcon_sm><FaCloudflare className="Skill-Icon me-3" />Cloudflare</SkillIcon_sm>
            </SkillsSection>
            <SkillsSection>
              <FieldTitle className="josefin-sans">Web Design</FieldTitle>
              <SkillIcon_sm><FiFramer className="Skill-Icon me-3" />Framer</SkillIcon_sm>
              <SkillIcon_sm><FaSquarespace className="Skill-Icon me-3" />Squarespace</SkillIcon_sm>
              <SkillIcon_sm><FaFigma className="Skill-Icon me-3" />Figma</SkillIcon_sm>
            </SkillsSection>
          </Col>
          <StyledColMiddle md={4} className="text-light text-center">
            <SkillIcon><BsGraphUpArrow className="Skill-Icon" /></SkillIcon>
            <SkillTitle className="SkillTitle text-light josefin-sans">Data Analytics</SkillTitle>
            <Spacing />
            <SkillsSection>
              <FieldTitle className="josefin-sans">Applications</FieldTitle>
              <SkillIcon_sm><IoLogoTableau className="Skill-Icon me-3" /> Tableau</SkillIcon_sm>
              <SkillIcon_sm><SiPowerbi className="Skill-Icon me-3" /> Power BI</SkillIcon_sm>
            </SkillsSection>
            <SkillsSection>
              <FieldTitle className="josefin-sans">Visualisation</FieldTitle>
              <SkillIcon_sm><SiPlotly className="Skill-Icon me-3" /> Plotly</SkillIcon_sm>
              <SkillIcon_sm>Seaborn</SkillIcon_sm>
              <SkillIcon_sm>Matplotlib</SkillIcon_sm>
            </SkillsSection>
            <SkillsSection>
              <FieldTitle className="josefin-sans">Data Manipulation</FieldTitle>
              <SkillIcon_sm><SiPandas className="Skill-Icon me-3" /> Pandas</SkillIcon_sm>
              <SkillIcon_sm><SiNumpy className="Skill-Icon me-3" /> Numpy</SkillIcon_sm>
            </SkillsSection>
          </StyledColMiddle>
          <Col md={4} className="text-light text-center">
            <SkillIcon><FaRobot className="Skill-Icon me-3" /></SkillIcon>
            <SkillTitle className="SkillTitle text-light josefin-sans">Machine & Deep Learning</SkillTitle>
            <Spacing />
            <SkillsSection>
              <FieldTitle className="josefin-sans">Machine Learning</FieldTitle>
              <SkillIcon_sm><SiScikitlearn className="Skill-Icon me-3" /> Scikit-learn</SkillIcon_sm>
              <SkillIcon_sm><SiKeras className="Skill-Icon me-3" /> Keras</SkillIcon_sm>
              <SkillIcon_sm><SiGooglecloud className="Skill-Icon me-3" /> AutoML</SkillIcon_sm>
            </SkillsSection>
            <SkillsSection>
              <FieldTitle className="josefin-sans">Deep Learning</FieldTitle>
              <SkillIcon_sm><SiTensorflow className="Skill-Icon me-3" /> TensorFlow</SkillIcon_sm>
              <SkillIcon_sm><SiPytorch className="Skill-Icon me-3" /> PyTorch</SkillIcon_sm>
            </SkillsSection>
            <SkillsSection>
              <FieldTitle className="josefin-sans">Reinforcement Learning</FieldTitle>
              <SkillIcon_sm><AiFillOpenAI className="Skill-Icon me-3" /> OpenAI Gym</SkillIcon_sm>
            </SkillsSection>
            <SkillsSection>
              <FieldTitle className="josefin-sans">Networks</FieldTitle>
              <SkillIcon_sm>Neural Networks</SkillIcon_sm>
              <SkillIcon_sm>Convolutional Neural Networks</SkillIcon_sm>
              <SkillIcon_sm>Recurrent Neural Networks</SkillIcon_sm>
              <SkillIcon_sm>Generative Adversarial Networks</SkillIcon_sm>
              <SkillIcon_sm>Self-Attention Networks</SkillIcon_sm>
              <SkillIcon_sm>Deep Q Networks</SkillIcon_sm>
            </SkillsSection>
          </Col>
        </StyledRow>
      </StyledContainer>
    </OuterDiv>
  );
}

export default MySkills;
