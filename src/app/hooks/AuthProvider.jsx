"use client"
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axiosInstance";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [token, setToken] = useState(null);

    // first check token on localstorage
    useEffect(() => {
        if(typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('token');
            console.log("stored token:", storedToken); // for debug
            setToken(storedToken);

            // if token not found the end the loading
            if(!storedToken) {
                setLoading(false);
                setInitialLoadDone(true);
            };
        } else {
            setLoading(false)
            setInitialLoadDone(true);
        }
    }, [])

    // use useEffect for set token
    useEffect(() => {
        if(typeof window !== 'undefined'  && token) {
            localStorage.setItem('token', token);
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    }, [token]);

    // load user effect
    useEffect(() => {
        const loadUser = async() => {
            // if token not found then just return
            if(!token) {
                setLoading(false);
                setInitialLoadDone(true);
                return;
            }

            // if user already loaded then do not load again
            if(user) {
                setLoading(false);
                setInitialLoadDone(true);
                return;
            }

            try {
                setLoading(true);
                console.log('Loading user with token : ', token); // for debug

                const response = await axiosInstance.get(`/users/me`);
                console.log("user response :", response.data);

                if(response.data?.data) {
                    setUser(response.data.data);
                    // Store user info in localStorage for quick access
                    if(typeof window !== 'undefined') {
                        localStorage.setItem("user", JSON.stringify(response.data.data));
                        localStorage.setItem("userName", response.data.data.name);
                        localStorage.setItem("userEmail", response.data.data.email);
                        localStorage.setItem("userRole", response.data.data.role);
                    }
                } else {
                    // if user not found then remove the token
                    handleInvalidToken();
                }
            } catch (error) {
                console.error("Failed to load user:", error);
                
                // if token invalid then make sign out
                if(error.response?.status === 401 || error.message?.includes('jwt')) {
                    handleInvalidToken();
                    toast.error('Session expired. Please login again');
                }
            } finally {
                setLoading(false);
                setInitialLoadDone(true);
            }
        }

        loadUser();
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    // invalid token handle function
    const handleInvalidToken = () => {
        if(typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem("user");
            localStorage.removeItem("userName");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("userRole");
        }
        setToken(null);
        setUser(null);
        delete axiosInstance.defaults.headers.common['Authorization'];
    };

    // sign up
const signup = async (userData) => {
    try {
        setLoading(true);
        console.log("Sending signup request to:", `${axiosInstance.defaults.baseURL}/users/signup`);
        console.log("With data:", userData);
        
        const response = await axiosInstance.post('/users/signup', userData);
        console.log("Signup response:", response);

        if(response.data.success) {
            // Note: The backend doesn't return token or user on signup
            // So we don't set token/user here - user needs to login after signup
            toast.success("Account created successfully! Please login.");
            return {success: true, data: response.data};
        } else {
            const errorMessage = response.data.message || "Signup failed";
            toast.error(errorMessage);
            return {success: false, error: errorMessage};
        }
    } catch (error) {
        console.error("Signup error details:", error);
        console.error("Error response:", error.response);
        console.error("Error response data:", error.response?.data);
        
        let errorMessage = "Sign up failed";
        
        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        toast.error(errorMessage);
        return {success: false, error: errorMessage};
    } finally {
        setLoading(false);
    }
};

    // log in
    const login = async(credentials) => {
        try {
            setLoading(true);
            const response = await axiosInstance.post("/users/login", credentials);

            if(response.data.success) {
                setToken(response.data.token);
                setUser(response.data.user);
                
                if(typeof window !== 'undefined') {
                    localStorage.setItem("user", JSON.stringify(response.data.user));
                    localStorage.setItem("userName", response.data.user.name);
                    localStorage.setItem("userEmail", response.data.user.email);
                    localStorage.setItem("userRole", response.data.user.role);
                }
                
                toast.success("Logged in successfully!");
                return {success: true, data: response.data};
            }
        } catch (error) {
            const message = error.response?.data?.message || "Invalid email or password";
            toast.error(message);
            return {success: false, error: message};
        } finally {
            setLoading(false);
        }
    };

    // log out
    const logout = async() => {
        try {
            if(token) {
                try {
                    await axiosInstance.post("/users/logout");
                } catch (error) {
                    console.error("Backend log out error: ", error);
                }
            }
        } finally {
            // clear localStorage
            if(typeof window !== 'undefined') {
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                localStorage.removeItem("userName");
                localStorage.removeItem("userEmail");
                localStorage.removeItem("userRole");
            }
            setToken(null);
            setUser(null);
            delete axiosInstance.defaults.headers.common['Authorization'];
            toast.success("Logged out successfully");

            // redirect
            if(typeof window !== 'undefined') {
                window.location.href = '/auth/login';
            }
        }
    };

    // update user
    const updateUser = async (userId, updateData) => {
        try {
            setLoading(true);
            const response = await axiosInstance.put(`/users/${userId}`, updateData);
            
            if(response.data.success) {
                setUser(response.data.data);
                if(typeof window !== 'undefined') {
                    localStorage.setItem("user", JSON.stringify(response.data.data));
                    localStorage.setItem("userName", response.data.data.name);
                    localStorage.setItem("userEmail", response.data.data.email);
                    localStorage.setItem("userRole", response.data.data.role);
                }
                toast.success("User updated successfully!");
                return {success: true, data: response.data};
            }
        } catch (error) {
            const message = error.response?.data?.message || "Failed to update user";
            toast.error(message);
            return {success: false, error: message};
        } finally {
            setLoading(false);
        }
    };

    // upload profile picture
    const uploadProfilePicture = async (file) => {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('profilePicture', file);
            
            const response = await axiosInstance.post('/users/upload-profile-picture', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            if(response.data.success) {
                setUser(prev => ({...prev, profilePicture: response.data.data.profilePicture}));
                if(typeof window !== 'undefined') {
                    const updatedUser = {...user, profilePicture: response.data.data.profilePicture};
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                }
                toast.success("Profile picture uploaded successfully!");
                return {success: true, data: response.data};
            }
        } catch (error) {
            const message = error.response?.data?.message || "Failed to upload profile picture";
            toast.error(message);
            return {success: false, error: message};
        } finally {
            setLoading(false);
        }
    };

    // delete profile picture
    const deleteProfilePicture = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.delete('/users/profile-picture');
            
            if(response.data.success) {
                setUser(prev => ({...prev, profilePicture: null}));
                if(typeof window !== 'undefined') {
                    const updatedUser = {...user, profilePicture: null};
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                }
                toast.success("Profile picture deleted successfully!");
                return {success: true, data: response.data};
            }
        } catch (error) {
            const message = error.response?.data?.message || "Failed to delete profile picture";
            toast.error(message);
            return {success: false, error: message};
        } finally {
            setLoading(false);
        }
    };

    // upload cover photo
    const uploadCoverPhoto = async (file) => {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('coverPhoto', file);
            
            const response = await axiosInstance.post('/users/upload-cover-photo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            if(response.data.success) {
                setUser(prev => ({...prev, coverPhoto: response.data.data.coverPhoto}));
                if(typeof window !== 'undefined') {
                    const updatedUser = {...user, coverPhoto: response.data.data.coverPhoto};
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                }
                toast.success("Cover photo uploaded successfully!");
                return {success: true, data: response.data};
            }
        } catch (error) {
            const message = error.response?.data?.message || "Failed to upload cover photo";
            toast.error(message);
            return {success: false, error: message};
        } finally {
            setLoading(false);
        }
    };

    // delete cover photo
    const deleteCoverPhoto = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.delete('/users/cover-photo');
            
            if(response.data.success) {
                setUser(prev => ({...prev, coverPhoto: null}));
                if(typeof window !== 'undefined') {
                    const updatedUser = {...user, coverPhoto: null};
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                }
                toast.success("Cover photo deleted successfully!");
                return {success: true, data: response.data};
            }
        } catch (error) {
            const message = error.response?.data?.message || "Failed to delete cover photo";
            toast.error(message);
            return {success: false, error: message};
        } finally {
            setLoading(false);
        }
    };

    // delete user
    const deleteUser = async (userId) => {
        try {
            setLoading(true);
            const response = await axiosInstance.delete(`/users/${userId}`);
            
            if(response.data.success) {
                // If deleting the current user, log them out
                if(user?._id === userId) {
                    await logout();
                }
                toast.success("User deleted successfully!");
                return {success: true, data: response.data};
            }
        } catch (error) {
            const message = error.response?.data?.message || "Failed to delete user";
            toast.error(message);
            return {success: false, error: message};
        } finally {
            setLoading(false);
        }
    };

    // get user by id
    const getUserById = async (userId) => {
        try {
            const response = await axiosInstance.get(`/users/${userId}`);
            if(response.data.success) {
                return {success: true, data: response.data.data};
            }
        } catch (error) {
            const message = error.response?.data?.message || "Failed to get user";
            return {success: false, error: message};
        }
    };

    // get user by email
    const getUserByEmail = async (email) => {
        try {
            const response = await axiosInstance.get(`/users/email/${email}`);
            if(response.data.success) {
                return {success: true, data: response.data.data};
            }
        } catch (error) {
            const message = error.response?.data?.message || "Failed to get user";
            return {success: false, error: message};
        }
    };

    // get all users
    const getAllUsers = async (params = {}) => {
        try {
            const response = await axiosInstance.get('/users', { params });
            if(response.data.success) {
                return {success: true, data: response.data.data};
            }
        } catch (error) {
            const message = error.response?.data?.message || "Failed to get users";
            return {success: false, error: message};
        }
    };

    // refresh user
    const refreshUser = async () => {
        try {
            const response = await axiosInstance.get('/users/me');
            if(response.data?.data) {
                setUser(response.data.data);
                if(typeof window !== 'undefined') {
                    localStorage.setItem("user", JSON.stringify(response.data.data));
                    localStorage.setItem("userName", response.data.data.name);
                    localStorage.setItem("userEmail", response.data.data.email);
                    localStorage.setItem("userRole", response.data.data.role);
                }
                return {success: true, data: response.data.data};
            }
        } catch (error) {
            console.error("Failed to refresh user:", error);
            return {success: false, error: error.message};
        }
    };

    const userInfo = {
        user,
        loading,
        initialLoadDone,
        token,
        isAuthenticated: !!token && !!user,
        signup,
        login,
        logout,
        updateUser,
        uploadProfilePicture,
        deleteProfilePicture,
        uploadCoverPhoto,
        deleteCoverPhoto,
        deleteUser,
        getUserById,
        getUserByEmail,
        getAllUsers,
        refreshUser,
    };
    
    return (
        <AuthContext.Provider value={userInfo}>
            {children}
        </AuthContext.Provider>
    );
};