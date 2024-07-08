import React, { useEffect, useRef } from 'react';
import Card from 'react-bootstrap/Card';
import styled from 'styled-components';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const OuterDiv = styled.div`
  background-color: #000000;
  padding: 50px 0;
`;

const StyledContainer = styled(Container)`
  padding: 0 2rem;
  color: white;
`;

const StyledRow = styled(Row)`
  display: flex;
  align-items: stretch;
  margin-bottom: 30px;
`;

const StyledCol = styled(Col)`
    display: flex;
    align-items: stretch;
    padding-bottom: 30px;
    `;

const StyledCard = styled(Card)`
  height: 100%;
  margin-bottom: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
  background-color: #2c2c2c;
  border: none;
  border-radius: 15px;
  overflow: hidden;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  }

  .card-body {
    padding: 1.5rem;
  }

  .card-title {
    font-size: 1.5rem;
    color: #f8f9fa;
  }

  .card-subtitle {
    font-size: 1rem;
    color: #adb5bd;
  }

  .card-text {
    font-size: 1rem;
    color: #ced4da;
  }

  .card-link {
    color: #0d6efd;
    &:hover {
      text-decoration: underline;
    }
  }

  .card-img-top,
  .card-video-top {
    height: 200px;
    object-fit: cover;
  }
`;

function Projects() {
  const cardContents = useRef([]);

  useEffect(() => {
    const updateContentHeight = () => {
      let maxHeight = 0;

      cardContents.current.forEach(content => {
        if (content) {
          maxHeight = Math.max(maxHeight, content.clientHeight);
        }
      });

      cardContents.current.forEach(content => {
        if (content) {
          content.style.height = `${maxHeight}px`;
        }
      });
    };

    updateContentHeight();
    window.addEventListener('resize', updateContentHeight);

    return () => {
      window.removeEventListener('resize', updateContentHeight);
    };
  }, []);

  return (
    <OuterDiv>
      <StyledContainer>
        <h1 className="text-center text-light josefin-sans my-5 pb-5">My Projects !</h1>

        <StyledRow>
          <StyledCol lg={4} md={6}>
            <StyledCard>
              <Card.Img
                ref={el => cardContents.current[0] = el}
                className="card-img-top"
                variant="top"
                src="/VegePrediction.png"
              />
              <Card.Body>
                <Card.Title>Vege Prediction</Card.Title>
                <Card.Subtitle className="mb-2">Full Stack Deep Learning Project</Card.Subtitle>
                <Card.Text>
                  A website to allow users to upload images of vegetables and get a prediction of the vegetable type.
                </Card.Text>
                <Card.Link href="https://veggie-128d.onrender.com/">Website</Card.Link>
                <Card.Link href="https://gitlab.com/kyourandesu1/vegetable-prediction">GitLab</Card.Link>
              </Card.Body>
            </StyledCard>
          </StyledCol>
          <StyledCol lg={4} md={6}>
            <StyledCard>
              <Card.Img
                ref={el => cardContents.current[1] = el}
                className="card-img-top"
                variant="top"
                src="/CarPrediction.png"
              />
              <Card.Body>
                <Card.Title>Car Price Prediction</Card.Title>
                <Card.Subtitle className="mb-2">Full Stack ML Project</Card.Subtitle>
                <Card.Text>
                  A website to allow users to predict the price of a car based on its features.
                </Card.Text>
                <Card.Link href="https://devops-ca1-jovan-tan.onrender.com/">Website</Card.Link>
                <Card.Link href="https://gitlab.com/devops-ml-jovan/car-price-prediction">GitLab</Card.Link>
              </Card.Body>
            </StyledCard>
          </StyledCol>
          <StyledCol lg={4} md={6}>
            <StyledCard>
              <video
                ref={el => cardContents.current[2] = el}
                className="card-video-top"
                autoPlay
                loop
                muted
              >
                <source src="Cartpole.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <Card.Body>
                <Card.Title>Gymnasium RL</Card.Title>
                <Card.Subtitle className="mb-2">Reinforcement Learning</Card.Subtitle>
                <Card.Text>
                  Going through as many gymnasium environments as possible to learn about RL.
                </Card.Text>
                <Card.Link href="#">Details</Card.Link>
                <Card.Link href="#">GitHub</Card.Link>
              </Card.Body>
            </StyledCard>
          </StyledCol>
          <StyledCol lg={4} md={6}>
            <StyledCard>
              <Card.Img
                ref={el => cardContents.current[3] = el}
                className="card-img-top"
                variant="top"
                src="/DisabilityWebsite.png"
              />
              <Card.Body>
                <Card.Title>Website about Disabilities</Card.Title>
                <Card.Subtitle className="mb-2">Web Development</Card.Subtitle>
                <Card.Text>
                    A website to gain awareness about learning disabilities and how to help them.
                </Card.Text>
                <Card.Link href="https://kyourandesu.github.io/learning-disability-website/">Details</Card.Link>
                <Card.Link href="https://github.com/kyourandesu/learning-disability-website">GitHub</Card.Link>
              </Card.Body>
            </StyledCard>
          </StyledCol>
          <StyledCol lg={4} md={6}>
            <StyledCard>
              <Card.Img
                ref={el => cardContents.current[4] = el}
                className="card-img-top"
                variant="top"
                src="/GAN.png"
              />
              <Card.Body>
                <Card.Title>Generative Adversarial Network</Card.Title>
                <Card.Subtitle className="mb-2">Deep Learning</Card.Subtitle>
                <Card.Text>
                  A project to generate images using different GANs based on CIFAR10 dataset.
                </Card.Text>
                <Card.Link href="#">Details</Card.Link>
                <Card.Link href="#">GitHub</Card.Link>
              </Card.Body>
            </StyledCard>
          </StyledCol>
          <StyledCol lg={4} md={6}>
            <StyledCard>
              <video
                ref={el => cardContents.current[5] = el}
                className="card-video-top"
                autoPlay
                loop
                muted
              >
                <source src="Pendulum1.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <Card.Body>
                <Card.Title>RL Networks</Card.Title>
                <Card.Subtitle className="mb-2">Reinforcement Learning</Card.Subtitle>
                <Card.Text>
                  Using many different networks to solve the Pendulum environment.
                </Card.Text>
                <Card.Link href="#">Details</Card.Link>
                <Card.Link href="#">GitHub</Card.Link>
              </Card.Body>
            </StyledCard>
          </StyledCol>
        </StyledRow>
      </StyledContainer>
    </OuterDiv>
  );
}

export default Projects;
