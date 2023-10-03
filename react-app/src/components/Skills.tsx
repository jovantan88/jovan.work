function Skills() {
    return (
        <div className="outsideSkills">
            <section className="container skills" id="skills">
                <h2>KNOWLEDGE AND SKILLS</h2>

                <div className="row">
                    <div className="col-12 col-md-6 col-lg-4 skillname">
                        <h5>Web Development</h5>
                        {/* Web Development: HTML, CSS, jQuery, Axios, NodeJS, ExpressJS, Microsoft Power Apps 
Data Analytics: Python, Pandas, Numpy, Matplotlib, Minitab 
Data Visualization: Seaborn, Plotly, Tableau, Power BI 
Machine learning: Scikit-learn, Statsmodels, Orange Data Mining, Lobe AI 
Database Management: MySQL, MongoDB, SQL Server Management Studio 
Mathematics: Statistics, Matrix, Calculus 
Languages Spoken: English, Chinese 
Communication: Public Speaking communication skills (Grade 5 Certified) */}
                        <span className="highlight">HTML</span>
                        <span className="highlight">CSS</span>
                        <span className="highlight">jQuery</span>
                        <span className="highlight">Axios</span>
                        <span className="highlight">NodeJS</span>
                        <span className="highlight">ExpressJS</span>
                        <span className="highlight">Microsoft Power Apps</span>

                    </div>
                    <div className="col-12 col-md-6 col-lg-4 skillname">
                        <h5>Data Analytics</h5>
                        <span className="highlight">Python</span>
                        <span className="highlight">Pandas</span>
                        <span className="highlight">Numpy</span>
                        <span className="highlight">Matplotlib</span>
                        <span className="highlight">Minitab</span>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4 skillname">
                        <h5>Data Visualization</h5>
                        <span className="highlight">Seaborn</span>
                        <span className="highlight">Plotly</span>
                        <span className="highlight">Tableau</span>
                        <span className="highlight">Power BI</span>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4 skillname">
                        <h5>Machine Learning</h5>
                        <span className="highlight">Scikit-learn</span>
                        <span className="highlight">Statsmodels</span>
                        <span className="highlight">Orange Data Mining</span>
                        <span className="highlight">Lobe AI</span>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4 skillname">
                        <h5>Database Management</h5>
                        <span className="highlight">MySQL</span>
                        <span className="highlight">MongoDB</span>
                        <span className="highlight">SQL Server Management Studio</span>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4 skillname">
                        <h5>Mathematics</h5>
                        <span className="highlight">Statistics</span>
                        <span className="highlight">Matrix</span>
                        <span className="highlight">Calculus</span>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4 skillname">
                        <h5>Languages Spoken</h5>
                        <span className="highlight">English</span>
                        <span className="highlight">Chinese</span>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4 skillname">
                        <h5>Communication</h5>
                        <span className="highlight">Public Speaking communication skills (Grade 5 Certified)</span>
                    </div>
                </div>
            </section>
        </div>
    )

}

export default Skills;