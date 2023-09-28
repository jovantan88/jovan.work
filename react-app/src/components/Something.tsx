// import ReactPDF from '@react-pdf/renderer'
// ReactPDF.render(<MyDocument />, `public/portfolio internship.pdf`);
import ResumePDF from './ResumePDF.tsx';

function Something() {
    return (
        <>
            <div className="something">
                <p id="02" className="text-light fw-bold mono fs-5 d-flex justify-content-center p-5">Sorry, this website is still being developed but you can still view my portfolio pdf below. Come back soon!</p>
                {/* <iframe className="pdf  mx-auto" src="https://docs.google.com/document/d/14AjqbTTV3IHTcIilT7wlu-4QzWhIH-LfF3mmwUawIeo/edit?usp=sharing/preview">
                </iframe> */}
                <ResumePDF />
            </div>
        </>
    )
}

export default Something