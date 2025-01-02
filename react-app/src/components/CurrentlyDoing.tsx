// src/components/CurrentlyDoing.tsx
import React from 'react';
import styled from 'styled-components';
import 'bootstrap/dist/css/bootstrap.min.css';

// Define your current activities data
const currentActivities = [
    {
        title: 'Machine Learning Engineer Learning Path',
        description: 'Enrolled in a comprehensive course by Google to deepen my understanding of machine learning algorithms, data processing, and model deployment.',
        date: 'Ongoing',
        endDate: null, // Indicates ongoing activity
        badgeVariant: 'primary',
        link: 'https://www.cloudskillsboost.google/paths/17', 
    },
    {
        title: 'Intern at Industry Platform',
        description: 'Gaining hands-on experience in software development, collaborating with cross-functional teams, and contributing to real-world projects.',
        date: 'Until January 10, 2025',
        endDate: '2025-01-10', // ISO format for easy parsing
        badgeVariant: 'warning',
        link: 'https://www.industry-platform.com/', 
    },
    {
        title: 'Maritime Hackathon 2025',
        description: 'Participating in a 2-day hackathon organized by NUS to develop innovative solutions for the maritime industry.',
        date: 'January 17-18, 2025',
        endDate: '2025-01-18', // End date of the hackathon
        badgeVariant: 'danger',
        link: 'https://www.maritimestudies.nus.edu.sg/maritime-hackathon-2025/', // Replace with actual hackathon link
    },
    {
        title: 'Personal Projects',
        description: 'Engaging in various small projects to experiment with new technologies, frameworks, and tools to enhance my skill set.',
        date: 'Ongoing',
        endDate: null, // Indicates ongoing activity
        badgeVariant: 'secondary',
        link: 'https://github.com/jovantan88', // Replace with your GitHub or portfolio link
    },
    // Add more activities as needed
];

// Styled-component for the section container
const CurrentlyDoingSection = styled.section`
    background-color: #000000;
    padding: 60px 20px;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;

    @media (min-width: 768px) {
        padding: 80px 40px;
    }

    @media (min-width: 1200px) {
        padding: 100px 100px;
    }

    h2 {
        margin-bottom: 100px;
        color: #ffffff;
        font-size: 2.5rem;
        text-align: center;
    }

    .card {
        background-color: #1a1a1a;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        transition: transform 0.2s;
        cursor: pointer;
        text-decoration: none;
    }

    .card:hover {
        transform: scale(1.02);
        text-decoration: none;
    }

    .badge {
        font-size: 0.9rem;
    }

    /* Remove link default styles */
    a {
        color: inherit;
        text-decoration: none;
    }
`;

const CurrentlyDoing = () => {
    // Function to determine if an activity is currently active
    const isOngoing = (activity) => {
        if (!activity.endDate) {
            // Ongoing activities are always active
            return true;
        }

        const today = new Date();
        const activityEndDate = new Date(activity.endDate);
        activityEndDate.setHours(23, 59, 59, 999); // Ensure inclusivity

        return activityEndDate >= today;
    };

    // Function to determine if an activity ended within the last month
    const isRecentlyEnded = (activity) => {
        if (!activity.endDate) {
            // Ongoing activities are not recently ended
            return false;
        }

        const today = new Date();
        const activityEndDate = new Date(activity.endDate);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);

        // Check if activity ended between one month ago and today
        return activityEndDate < today && activityEndDate >= oneMonthAgo;
    };

    // Filter activities into ongoing and recently ended
    const ongoingActivities = currentActivities.filter(isOngoing);
    const recentlyEndedActivities = currentActivities.filter(isRecentlyEnded);

    return (
        <CurrentlyDoingSection>
            <h2 data-aos="fade-up"
                data-aos-offset="300"
                data-aos-delay="0"
                data-aos-duration="400"
                data-aos-easing="ease"
                data-aos-mirror="false"
                data-aos-once="false"
                data-aos-anchor-placement="top-bottom" >Currently Doing</h2>
            <div className="container">
                <div className="row">
                    {ongoingActivities.map((activity, index) => (
                        <div className="col-12 mb-4" key={index} data-aos="fade-up"
                        data-aos-offset="300"
                        data-aos-delay="0"
                        data-aos-duration="400"
                        data-aos-easing="ease"
                        data-aos-mirror="false"
                        data-aos-once="false"
                        data-aos-anchor-placement="top-bottom" >
                            <a href={activity.link} target="_blank" rel="noopener noreferrer">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <h5 className="card-title">{activity.title}</h5>
                                        <p className="card-text">{activity.description}</p>
                                        <span className={`badge bg-${activity.badgeVariant}`}>
                                            {activity.date}
                                        </span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    ))}
                    {ongoingActivities.length === 0 && (
                        <div className="col-12">
                            <p className="text-white">No current activities to display.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recently Ended Section */}
            {recentlyEndedActivities.length > 0 && (
                <>
                    <h2 className="mt-5">Recently Ended</h2>
                    <div className="container">
                        <div className="row">
                            {recentlyEndedActivities.map((activity, index) => (
                                <div className="col-12 mb-4" key={`recent-${index}`}>
                                    <a href={activity.link} target="_blank" rel="noopener noreferrer">
                                        <div className="card h-100">
                                            <div className="card-body">
                                                <h5 className="card-title">{activity.title}</h5>
                                                <p className="card-text">{activity.description}</p>
                                                <span className={`badge bg-${activity.badgeVariant}`}>
                                                    {activity.date}
                                                </span>
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </CurrentlyDoingSection>
    );
};

export default CurrentlyDoing;
