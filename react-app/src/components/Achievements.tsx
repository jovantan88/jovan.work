// src/components/Achievements.tsx
import styled from 'styled-components';
import 'bootstrap/dist/css/bootstrap.min.css';

// Define your achievements data with LinkedIn links
const achievements = [
    {
        title: '2nd Place',
        description: 'IMDA Solid Pod Hackathon',
        date: '2024',
        badgeVariant: 'success',
        linkedinLink: 'https://www.linkedin.com/posts/jovan-tan-jun-da_hackathon-techinnovation-solidpod-activity-7247124134877356032-o-bs?utm_source=share&utm_medium=member_desktop', // Replace with your actual LinkedIn post URL
    },
    {
        title: '5th Place',
        description: 'Singapore AI CTF by Govtech',
        date: '2024',
        badgeVariant: 'info',
        linkedinLink: 'https://www.linkedin.com/posts/jovan-tan-jun-da_ctf-aisecurity-govtech-activity-7259994455363997696-PyWL?utm_source=share&utm_medium=member_desktop', // Replace with your actual LinkedIn post URL
    },
];

const AchievementsDiv = styled.div`
    background-color: #000000;
    padding: 60px 20px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;

    @media (min-width: 768px) {
        padding: 80px 40px;
    }

    @media (min-width: 1200px) {
        padding: 100px 100px;
    }

    h2 {
        margin-bottom:100px;
        color: #ffffff;
        font-size: 2.5rem;
        text-align: center;
    }

    .row {
        width: 100%;
        max-width: 1200px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
    }

    .card {
        transition: transform 0.3s, box-shadow 0.3s;
        &:hover {
            transform: translateY(-10px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        }
    }

    .badge {
        font-size: 0.9rem;
    }

    .btn-outline-light {
        font-size: 0.9rem;
    }
`;

const Achievements = () => {
    return (
        <AchievementsDiv>
            <h2 data-aos="fade-up"
                data-aos-offset="300"
                data-aos-delay="0"
                data-aos-duration="400"
                data-aos-easing="ease"
                data-aos-mirror="false"
                data-aos-once="false"
                data-aos-anchor-placement="top-bottom" className="CardAnimation">My Achievements</h2>
            <div className="row"data-aos="fade-up"
                data-aos-offset="300"
                data-aos-delay="0"
                data-aos-duration="400"
                data-aos-easing="ease"
                data-aos-mirror="false"
                data-aos-once="false"
                data-aos-anchor-placement="top-bottom">
                {achievements.map((achievement, index) => (
                    <div className="col-12 col-sm-6 col-lg-4" key={index}>
                        <div className="card bg-secondary text-white shadow-sm h-100">
                            <div className="card-body d-flex flex-column">
                                <h5 className="card-title">{achievement.title}</h5>
                                <p className="card-text flex-grow-1">{achievement.description}</p>
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    <span className={`badge bg-${achievement.badgeVariant}`}>
                                        {achievement.date}
                                    </span>
                                    <a
                                        href={achievement.linkedinLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-outline-light btn-sm"
                                        aria-label={`Read more about ${achievement.title}`}
                                    >
                                        Read More
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </AchievementsDiv>
    );
};

export default Achievements;
