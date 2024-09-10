// app/login/page.js
"use client";
import { useState } from "react";
import styles from "../main.module.scss";
import { useRouter } from "next/navigation";
import { Button, Col, Form, Row } from "react-bootstrap";
import NavigationBar from "@/components/NavigationBar";

const LoginPage = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      // Redirect to the protected page after login
      router.push("/");
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div className={styles.main}>
      <NavigationBar />
      <h1>Login</h1>
      <Form onSubmit={handleSubmit}>
        <Row style={{ maxWidth: "500px" }}>
          <Col>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ maxWidth: "300px" }}
            />
          </Col>
          <Col>
            <Button variant="primary" type="submit">
              Login
            </Button>
          </Col>
        </Row>
        {error && <p>{error}</p>}
      </Form>
    </div>
  );
};

export default LoginPage;
