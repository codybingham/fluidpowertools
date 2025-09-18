# How to Create a Label/Sticker and Turn It into an NX Model
*A step-by-step guide for designing a label in Publisher and using it inside NX.*

---

## Tools and Software Needed
- Microsoft Publisher  
- NX  
- ECN Manager  

---

## Steps

### Step 1 — Create Your Label in Publisher
1. Create your sticker/label in Microsoft Publisher using the shape, line, text, and other tools.  
2. When finished, select all elements of your design, right-click, and choose **Group**.  
   ![[Pasted image 20250918144536.png]]  
3. Right-click the grouped image and select **Save as Picture…**  
   - Save this `.png` file anywhere on your computer with any name.  
   ![[Pasted image 20250918144717.png]]  
4. Record your label size: select the image, go to **Shape Format**, and note the **Height** and **Width** values.  
   ![[Pasted image 20250918145409.png]]  

---

### Step 2 — Turn Your Label into an NX Model
1. In NX, go to **File → New → Item**.  
2. Enter a description and set the revision to `1.000`.  
   - If you have an item number, set it by clicking the tag icon under the *Name and Attributes* box.
   ![[Pasted image 20250918145729.png]]  
3. Create a sketch: **Home → Extrude → Sketch Section**.  
   ![[Pasted image 20250918150447.png]]  
4. Choose a plane (e.g., *Top* for consistency).  
5. Draw a rectangle and dimension it to match your Publisher image using **Rapid Dimension**.  
   - Dimensions will show in mm (expected).  
   ![[Pasted image 20250918150844.png]]  
6. Click **Finish** to complete the sketch.  
7. In the **Extrude** dialog, set distance to `0.01 in` and press **OK**.  
   ![[Pasted image 20250918151207.png]]  
8. Insert the label image: **Tools → Raster Image**.  
9. Select the extrude face as the plane.  
10. Set **Select Image From:** to *Operating System* and choose your `.png`.  
    - Change file type from `*.tif` to `*.png` in the dialog.  
11. Place the lower-left corner of the image on the model.  
12. Resize: check **Lock Aspect Ratio**, update either width or height to the correct dimension, and press **OK**.  
    ![[Pasted image 20250918151859.png]]  
13. Edit the sketch to round the corners: right-click the extrusion → **Edit Sketch**.
    ![[Pasted image 20250918152501.png]]
14. Use **Fillet** to match your corners to the image, then press **Finish**.    
15. Assign a part number (if not already done) and save.  

---

✅ Your label is now an NX model, ready for use in assemblies.
