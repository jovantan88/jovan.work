function Education() {
    return (
        <>
            <div className="outsideEdu">
                <section id="education" className="container education">
                    <h2>EDUCATION</h2>

                    <div className="row">
                        <div className="col-12 col-md-6">
                            <h3>GCE O Levels | Maris Stella High School</h3>
                            <ul>
                                <li>Graduated in 2021</li>
                                <li>O-levels L1R4 Net Aggregate: 8</li>
                                <li>2 SYF Distinction (2019, 2021)</li>
                                <li>Distinctions : <br></br>
                                    <span className="highlight">Elementary Mathematics</span>
                                    <span className="highlight ">Additional Mathematics</span>
                                    <span className="highlight ">Physics</span>
                                    <span className="highlight ">Computing</span>
                                </li>
                            </ul>
                        </div>

                        <div className="col-12 col-md-6">
                            <h3>Diploma in Applied Analytics & Artificial Intelligence | Singapore Polytechnic</h3>
                            <ul>
                                <li>Expected Graduation 2025</li>
                                <li><a href="#skills">Skills obtained</a></li>
                            </ul>
                        </div>
                    </div>

                    <h3 className="pt-5">CCAs</h3>

                    <ul className="list-group list-group-flush">
                        <li className="ccaslist-group-item">SEED Special Interest Group
                            <ul>
                                <li>Hosted events to help out students</li>
                                <li>Participated in community service projects</li>
                                <li>Participated in internal coding competitions</li>
                            </ul>
                        </li>

                        <li className="ccaslist-group-item">SP Adventure Club
                            <ul>
                                <li>Joined many group sessions</li>
                                <li>Participated in community service projects</li>
                            </ul>
                        </li>

                        <li className="ccaslist-group-item">SP Astronomy Club
                            <ul>
                                <li>Joined many group sessions</li>
                            </ul>
                        </li>
                    </ul>
                </section>
            </div>

        </>
    );
}

export default Education;