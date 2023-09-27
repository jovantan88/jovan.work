// import ReactPDF
// import ReactPDF from '@react-pdf/renderer'
// ReactPDF.render(<MyDocument />, `public/portfolio internship.pdf`);
function Something() {
    return (
        <>
            <div className="something">
                <p id="02" className="fw-bold mono fs-5 d-flex justify-content-center p-5">Sorry, this website is still being developed but you can still view my portfolio pdf below. Come back soon!</p>
                <iframe className="pdf  mx-auto" src="/public/portfolio internship.pdf">
                </iframe>
            </div>

        </>
    )
}

export default Something