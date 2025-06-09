import { useEffect, useState } from "react";
import { Auth } from "./components/auth";
import TaskManager from "./components/task-manager";
import { supabase } from "./supabase-client";
import { type Session } from "@supabase/supabase-js";

function App() {
  const [session, setSession] = useState<Session | null>(null);

  const fetchSession = async () => {
    const curSession = await supabase.auth.getSession();
    console.log("Current session:", curSession);
    if(curSession.error) {
      console.error("Error fetching session:", curSession.error);
      return;
    }
    setSession(curSession.data.session);
  }

  useEffect(()=>{
    fetchSession()

    const {data : authListner} = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setSession(session);
      } else if (event === "SIGNED_OUT") {
        setSession(null);
      }
    });

    return () => {
      authListner.subscription.unsubscribe();
    };
  },[])

  const logout = () => async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      setSession(null);
      console.log("Logged out successfully");
    }
  };

  return (
    <>
      { session ? (
        <>
          <button onClick={logout()}>LogOut</button>
          <TaskManager session={session}/>
        </>
      ) : (
        <Auth />
      )}
    </>
  );
}
export default App;