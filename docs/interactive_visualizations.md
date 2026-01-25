# Interactive Visualizations

## Overview

The interpretation engine now includes advanced interactive visualizations to help users understand the decision logic and fuzzy evaluation processes behind soil interpretations.

## Features

### 1. Interactive Tree Diagram

**Access**: Navigate to Rule Tree tab → Click "Interactive" view mode button

The interactive tree diagram provides a visual representation of the interpretation's decision tree structure with the following features:

- **Auto-layout**: Automatic hierarchical tree layout using React Flow
- **Zoom & Pan**: Use mouse wheel to zoom, click and drag to pan around the tree
- **Collapsible Nodes**: Click the chevron icon on nodes with children to expand/collapse branches
- **Color-coded Nodes**: Nodes are color-coded by rating value:
  - Green (≥80%): High rating
  - Lime (60-79%): Moderate-high rating
  - Amber (40-59%): Moderate rating
  - Orange (20-39%): Low rating
  - Red (<20%): Very low rating
- **Mini-map**: Overview map in bottom-right corner for navigation
- **Controls**: Zoom in/out, fit view, and full screen controls

#### Node Details

Each node displays:
- Property name or evaluation label
- Operator type (if applicable)
- Rating percentage with progress bar
- Expand/collapse button (for nodes with children)
- Fuzzy curve button (for evaluations with fuzzy curves)

### 2. Branch Analysis

**Access**: Interactive view mode → Click any node

The branch analysis modal provides detailed information about a selected node and its relationship to the root rating:

#### Path to Root
- Visual representation of the path from the selected node to the root
- Shows all intermediate nodes with their ratings
- Highlights the selected node in blue
- Color-coded rating indicators

#### Subtree Statistics
- Total nodes in the subtree
- Number of evaluation nodes
- Maximum depth of the subtree

#### Node Details
Shows all properties of the selected node:
- Label/name
- Property being evaluated
- Operator type
- Expression (for crisp evaluations)
- Number of fuzzy control points (for fuzzy evaluations)
- Calculated rating value

### 3. Fuzzy Curve Plots

**Access**: Interactive view mode → Click the graph icon on evaluation nodes

For evaluations that use fuzzy curves, this feature provides:

- **Smooth Curve Visualization**: Interpolated curve showing the fuzzy membership function
- **Control Points**: Blue dots indicating the original control points from the evaluation
- **Input Value Marker**: Red dot and vertical line showing your input value
- **Output Value Marker**: Green horizontal line showing the calculated fuzzy rating
- **Interactive Tooltips**: Hover over points to see exact values
- **Method Information**: Displays the interpolation method used (linear, sigmoid, spline)
- **Inversion Indicator**: Shows if the curve is inverted

#### Curve Elements

- **X-axis**: Property value (e.g., pH, depth, etc.)
- **Y-axis**: Fuzzy rating (0-1, displayed as percentage)
- **Blue Line**: Fuzzy membership curve
- **Blue Dots**: Original control points from evaluation definition
- **Red Dot with Ring**: Your input value and its position on the curve
- **Red Dashed Line**: Vertical reference line at input value
- **Green Dashed Line**: Horizontal reference line at output rating

### 4. View Modes

#### List View (Default)
- Compact hierarchical tree structure
- Text-based with indentation
- Expandable/collapsible sections
- Shows all nodes at once
- Better for quick scanning and documentation

#### Interactive View
- Visual node-based diagram
- Zoom and pan capabilities
- Click interactions for detailed analysis
- Color-coded visual feedback
- Better for exploration and understanding relationships

## Use Cases

### Educational
- **Training**: Teach soil scientists how interpretations calculate
- **Documentation**: Visual documentation of interpretation logic
- **Validation**: Verify that interpretation rules match expectations

### Analytical
- **Debugging**: Identify why an interpretation returned a specific rating
- **Optimization**: Find critical nodes that most affect the final rating
- **Comparison**: Compare different property values and their effects

### Reporting
- **Presentations**: Export tree diagrams for presentations
- **Publications**: Include fuzzy curves in technical reports
- **Decision Support**: Show stakeholders the decision-making process

## Technical Details

### Libraries Used

- **React Flow**: Interactive node-based diagrams
  - Auto-layout with hierarchical positioning
  - Zoom, pan, and minimap controls
  - Custom node components with React

- **Recharts**: Responsive charts for fuzzy curves
  - Smooth line charts with interpolation
  - Interactive tooltips
  - Reference lines for input/output values
  - Customizable styling

### Data Flow

1. **Tree Construction**: Interpretation tree is loaded from JSON
2. **Evaluation**: User property values are evaluated through the tree
3. **Enrichment**: Tree nodes are enriched with calculated ratings
4. **Visualization**: Enriched tree is passed to visualization components
5. **Interaction**: User clicks trigger analysis and curve display

### Performance Considerations

- Trees with 100+ nodes render smoothly
- Fuzzy curves use 100-point interpolation for smooth appearance
- React Flow handles up to 500 nodes efficiently
- Collapsible nodes reduce visual complexity for large trees

## Future Enhancements

Potential additions:
- **Export**: Save tree diagrams as SVG/PNG images
- **Comparison Mode**: View two interpretations side-by-side
- **Sensitivity Analysis**: Vary inputs and see rating changes in real-time
- **Critical Path Highlighting**: Show which evaluations affect the rating most
- **3D Curves**: For properties with multiple dimensions
- **Animation**: Animate the evaluation process from leaves to root

## Tips

1. **Start with List View**: Get familiar with the tree structure first
2. **Switch to Interactive**: Explore relationships visually
3. **Click Nodes**: Use branch analysis to understand contribution
4. **View Curves**: Check fuzzy curves for evaluations that seem unexpected
5. **Zoom Appropriately**: Use zoom to focus on specific branches
6. **Use Minimap**: Navigate large trees quickly with the minimap

## Troubleshooting

**Tree not displaying**: Check that the interpretation has been evaluated with property values

**No fuzzy curve button**: That evaluation uses a crisp expression, not a fuzzy curve

**Performance issues**: Try collapsing large branches or switching to list view

**Ratings not showing**: Ensure you've filled in property values and clicked "Evaluate"
