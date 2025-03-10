'use client';
import { Button, Typography, Box, Container } from '@mui/material';

export default function Home() {
    return (
        <Container maxWidth="sm">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Next.js with Material UI
                </Typography>
                <Button variant="contained" color="primary">
                    Hello World
                </Button>
            </Box>
        </Container>
    );
} 