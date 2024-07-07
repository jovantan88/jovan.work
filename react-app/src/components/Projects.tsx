import React from 'react';
import Card from 'react-bootstrap/Card';
import styled from 'styled-components';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const OuterDiv = styled.div`
  background-color: #1c1c1c;
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

const StyledCard = styled(Card)`
  width: 100%;
  margin-bottom: 2rem;
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
  
  .card-img-top {
    height: 200px;
    object-fit: cover;
  }
`;

function Projects() {
    return (
        <OuterDiv>
            <StyledContainer>
                <h1 className="text-center text-light josefin-sans">Projects</h1>

                <StyledRow>
                    <Col md={4}>
                        <StyledCard>
                            <Card.Img variant="top" src="/VegePrediction.png" />
                            <Card.Body>
                                <Card.Title>Vege Prediction</Card.Title>
                                <Card.Subtitle className="mb-2 text-muted">AI Project</Card.Subtitle>
                                <Card.Text>
                                    Some quick example text to build on the card title and make up the
                                    bulk of the card's content.
                                </Card.Text>
                                <Card.Link href="#">Details</Card.Link>
                                <Card.Link href="#">GitHub</Card.Link>
                            </Card.Body>
                        </StyledCard>
                    </Col>
                    <Col md={4}>
                        <StyledCard>
                            <Card.Img variant="top" src="/CarPrediction.png" />
                            <Card.Body>
                                <Card.Title>Car Prediction</Card.Title>
                                <Card.Subtitle className="mb-2 text-muted">ML Project</Card.Subtitle>
                                <Card.Text>
                                    Some quick example text to build on the card title and make up the
                                    bulk of the card's content.
                                </Card.Text>
                                <Card.Link href="#">Details</Card.Link>
                                <Card.Link href="#">GitHub</Card.Link>
                            </Card.Body>
                        </StyledCard>
                    </Col>
                    <Col md={4}>
                        <StyledCard>
                            <video style={{ width: '100%', height: '200px', objectFit: 'cover' }} autoPlay loop muted>
                                <source src="Cartpole.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            <Card.Body>
                                <Card.Title>Gymnasium RL</Card.Title>
                                <Card.Subtitle className="mb-2 text-muted">Reinforcement Learning</Card.Subtitle>
                                <Card.Text>
                                    Some quick example text to build on the card title and make up the
                                    bulk of the card's content.
                                </Card.Text>
                                <Card.Link href="#">Details</Card.Link>
                                <Card.Link href="#">GitHub</Card.Link>
                            </Card.Body>
                        </StyledCard>
                    </Col>
                </StyledRow>
                <StyledRow>
                    <Col md={4}>
                        <StyledCard>
                            <Card.Img variant="top" src="/DisabilityWebsite.png" />
                            <Card.Body>
                                <Card.Title>Disability Website</Card.Title>
                                <Card.Subtitle className="mb-2 text-muted">Web Development</Card.Subtitle>
                                <Card.Text>
                                    Some quick example text to build on the card title and make up the
                                    bulk of the card's content.
                                </Card.Text>
                                <Card.Link href="#">Details</Card.Link>
                                <Card.Link href="#">GitHub</Card.Link>
                            </Card.Body>
                        </StyledCard>
                    </Col>
                    <Col md={4}>
                        <StyledCard>
                            <Card.Img variant="top" src="https://via.placeholder.com/300x200" />
                            <Card.Body>
                                <Card.Title>GAN</Card.Title>
                                <Card.Subtitle className="mb-2 text-muted">Generative Adversarial Network</Card.Subtitle>
                                <Card.Text>
                                    Some quick example text to build on the card title and make up the
                                    bulk of the card's content.
                                </Card.Text>
                                <Card.Link href="#">Details</Card.Link>
                                <Card.Link href="#">GitHub</Card.Link>
                            </Card.Body>
                        </StyledCard>
                    </Col>
                    <Col md={4}>
                        <StyledCard>
                            <video style={{ width: '100%', height: '200px', objectFit: 'cover' }} autoPlay loop muted>
                                <source src="Pendulum.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            <Card.Body>
                                <Card.Title>Reinforcement Learning</Card.Title>
                                <Card.Subtitle className="mb-2 text-muted">Reinforcement Learning</Card.Subtitle>
                                <Card.Text>
                                    Some quick example text to build on the card title and make up the
                                    bulk of the card's content.
                                </Card.Text>
                                <Card.Link href="#">Details</Card.Link>
                                <Card.Link href="#">GitHub</Card.Link>
                            </Card.Body>
                        </StyledCard>
                    </Col>
                </StyledRow>
            </StyledContainer>
        </OuterDiv>
    );
}

export default Projects;
