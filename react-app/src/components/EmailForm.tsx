import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import emailjs from "emailjs-com";

function EmailForm() {
    const [validated, setValidated] = useState(false);
    // 
    function sendEmail(e: React.FormEvent<HTMLFormElement>) {
        const form = e.currentTarget;
        console.log(form.checkValidity())
        if (form.checkValidity() === false) {
            e.preventDefault();
            e.stopPropagation();
        }
        setValidated(true);
        console.log(validated)
        if (form.checkValidity() === false){
            return;
        }
        console.log("Sending email...")
        e.preventDefault(); 
        emailjs
            .sendForm(
                "service_lj16zlp",
                "template_ayt7ahg",
                e.target as HTMLFormElement,
                "QPvaM4P9V_yGPq_ho"
            )
            .then(
                () => {
                    window.location.reload();
                },
                (error) => {
                    console.log(error.text);
                }
            );
    }

    return (
        <Form noValidate validated={validated} onSubmit={sendEmail}>
            <Row className="mb-3">
                <Form.Group as={Col} md="12" controlId="validationCustom01" >
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                        required
                        type="text"
                        placeholder="Name"
                        name="from_name"
                    />
                    <Form.Control.Feedback>Looks good!</Form.Control.Feedback>
                    <Form.Control.Feedback type="invalid">
                        {/* Required */}
                    </Form.Control.Feedback>
                </Form.Group>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} md="12" controlId="validationCustom03">
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" placeholder="name@example.com" name="user_email" required/>
                    <Form.Control.Feedback type="invalid">
                        {/* Please enter a valid email address. */}
                    </Form.Control.Feedback>
                </Form.Group>
            </Row>
            <Row>
                <Form.Group as={Col} md="12" controlId="validationCustom04">
                    <Form.Label>Message</Form.Label>
                    <Form.Control as="textarea" type="text" placeholder="Message" name="message" required/>
                    <Form.Control.Feedback type="invalid">
                        {/* Please provide something you want to tell me. */}
                    </Form.Control.Feedback>
                </Form.Group>
            </Row>
            <Button className="mt-3" type="submit">Submit form</Button>
        </Form >
    );
}

export default EmailForm;