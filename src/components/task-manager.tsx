import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "../supabase-client";
import type { Session } from "@supabase/supabase-js";

type Task = {
  id: number;
  title: string;
  description: string;
  email: string;
  isBeingEdited?: boolean;
  image_url: string | null; 
};

function App({session}: {session: Session}) {
  const [newTask, setNewTask] = useState<Omit<Task,"id"|"isBeingEdited">>({
    title: "",
    description: "",
    email: "", 
    image_url: ""
  });
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [taskImage,setTaskImage] = useState<File | null>(null);

  async function fetchTasks() {
    await supabase.from("tasks")
      .select("*")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error }: { data: Task[] | null; error: any }) => {
        if (error) {
          console.error("Error fetching tasks:", error);
        } else if (data) {
          setCurrentTasks(data.map(task => ({ ...task, isBeingEdited: false })));
        } else {
          setCurrentTasks([]);
        }
      }
    );
  }

  useEffect(()=>{
    fetchTasks()
  },[])

  useEffect(()=>{
    const channel = supabase.channel("tasks-channel");
    channel.on("postgres_changes",{
      event: "*",
      schema: "public",
      table: "tasks"
    },(payload) => {
      const newTask = payload.new as Task;
      const { eventType, new: newRow, old: oldRow } = payload;
      setCurrentTasks(prevTasks => {
        switch (eventType) {
          case "INSERT":
            return [...prevTasks, { ...newRow, isBeingEdited: false } as Task];
          case "UPDATE":
            return prevTasks.map(task =>
              task.id === newRow.id ? { ...newRow, isBeingEdited: false } as Task : task
            );
          case "DELETE":
            return prevTasks.filter(task => task.id !== oldRow.id);
          default:
            return prevTasks;
        }
      });
      console.log("New task added:", newTask);
    }).subscribe((status)=>[
      console.log("Subscription status:", status)
    ])

    // Cleanup function
    return () => {
        console.log("Unsubscribing from channel");
        channel.unsubscribe();
    };
  },[])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.title && newTask.description) {
      newTask.email = session?.user?.email || ""; 
      let imgUrl: string | null = null; 
      if(taskImage){
        imgUrl = await uploadImage(taskImage);
      }
      supabase.from("tasks")
        .insert([{...newTask, image_url: imgUrl}])
        .select()
        .single()
        .then(({ error }) => {
          if (error) {
            console.error("Error inserting task:", error);
          } else {
            console.log("Task added successfully:");
            // setCurrentTasks((prev)=>[...prev, { ...data, id: 0, isBeingEdited: false }]); // Add the new task to the current tasks
          }
        });
      // Reset the form after submission
      setNewTask({ title: "", description: "", email: "" , image_url: "" });
    } else {
      console.error("Please fill in both fields.");
    }
  };

  const deleteTask = async (id: number) =>{
    await supabase.from("tasks")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Error deleting task:", error);
        } else {
          console.log("Task deleted successfully");
          // Optionally, you can refresh the tasks list after deletion
          // setCurrentTasks(currentTasks.filter(task => task.id !== id));
        }
      }
    );
  }

  const handleEdit = async (id: number) => {
    const currentTask= currentTasks.find(task => task.id === id);
    if (!currentTask) {
      console.error("Task not found for editing");
      return;
    }
    await supabase.from("tasks")
      .update({
        title:currentTask.title,
        description: currentTask.description 
      })
      .eq("id", id)
      .select()
      .single()
      .then(({ error }) => {
        if (error) {
          console.error("Error updating task:", error);
        } else {
          console.log("Task updated successfully");
          // setCurrentTasks(data ? currentTasks.map(task =>
          //   task.id === id ? { ...task, title: data.title, description: data.description, isBeingEdited: false } : task
          // ) : currentTasks);
        }
      }
    );
    const taskToEdit = currentTasks.find(task => task.id === id);
    if (taskToEdit) {
      // Toggle the isBeingEdited state
      taskToEdit.isBeingEdited = false;
      setCurrentTasks([...currentTasks]); // Update the state to reflect the change
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file) return null;

    const imgPath = `${file.name}-${Date.now()}`;
    const { data, error } = await supabase.storage
      .from("todo-images")
      .upload(imgPath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("UPLOAD ERROR:", error);
      return null;
    }

    console.log("Upload successful, path:", data?.path);

    const { data: urlData } = await supabase.storage
      .from("todo-images")
      .getPublicUrl(data.path);

    console.log("Public URL:", urlData.publicUrl);

    return urlData.publicUrl;
  };


  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTaskImage(file);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "1rem" }}>
      <h2>Task Manager CRUD</h2>

      {/* Form to add a new task */}
      <form style={{ marginBottom: "1rem" }} onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Task Title"
          onChange={(e) =>
            setNewTask({ ...newTask, title: e.target.value })
          }
          value={newTask.title}
          required
          style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
        />
        <textarea
          placeholder="Task Description"
          onChange={(e) =>
            setNewTask({ ...newTask, description: e.target.value })
          }
          value={newTask.description}
          required
          style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
        />
        <input type="file" accept="image/*" style={{ marginBottom: "0.5rem" }} 
        onChange={handleFileChange}/>
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Add Task
        </button>
      </form>

      {/* List of Tasks */}
      { currentTasks.length > 0 ? (
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {currentTasks.map((task) => (
              task.isBeingEdited ?(
                <li
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "1rem",
                    marginBottom: "0.5rem",
                  }}
                  key={task.id}
                >
                <div>
                  <textarea
                    placeholder={task.title}
                    onChange={(e) => {
                      setCurrentTasks(currentTasks.map(t =>
                        t.id === task.id
                          ? { ...t, title: e.target.value }
                          : t
                      ));
                    }}
                    value={task.title}
                    required
                    style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
                  />
                  <textarea
                    placeholder={task.description}
                    onChange={(e) => {
                      setCurrentTasks(currentTasks.map(t =>
                        t.id === task.id
                          ? { ...t, description: e.target.value }
                          : t
                      ));
                    }}
                    value={task.description}
                    required
                    style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
                  />
                  <div>
                    <button style={{ padding: "0.5rem 1rem", marginRight: "0.5rem" }} onClick={()=>handleEdit(task.id)}>
                      Save
                    </button>
                    <button style={{ padding: "0.5rem 1rem" }} onClick={()=>{
                      const taskToEdit = currentTasks.find(t => t.id === task.id);
                      if (taskToEdit) {
                        // Toggle the isBeingEdited state
                        taskToEdit.isBeingEdited = false;
                        setCurrentTasks([...currentTasks]); 
                      }
                    }}>
                      Cancel
                    </button>
                  </div>
                </div>
                </li>
              ):(
              <li
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  padding: "1rem",
                  marginBottom: "0.5rem",
                }}
                key={task.id}
              >
                <div>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  {task.image_url && (<img src={task.image_url || ""} alt={"image"} style={{ height: "80px" }} />)}
                  <div>
                    <button style={{ padding: "0.5rem 1rem", marginRight: "0.5rem" }} onClick={()=>{
                      const taskToEdit = currentTasks.find(t => t.id === task.id);
                      if (taskToEdit) {
                        // Toggle the isBeingEdited state
                        taskToEdit.isBeingEdited = true;
                        setCurrentTasks([...currentTasks]); 
                      }
                    }}>
                      Edit
                    </button>
                    <button style={{ padding: "0.5rem 1rem" }} onClick={()=>deleteTask(task.id)}>Delete</button>
                  </div>
                </div>
              </li>)
          ))}
        </ul>
      ) : (
        <p>No tasks available. Please add a task.</p>
      )}
    </div>
  );
}

export default App;