def update_jumps_array(jumpsA):
    for row in jumpsA:
        # find first zero row, and then shift downwards
        if all(cell == 0 for cell in row):
            row[0] = 1 # 1,0,0,0,0,1
            row[5] = 1
            break
    return jumpsA


def sim_to_index(idx):
    return idx

def update_jumps(jumpsArray, idx):
    index = sim_to_index(idx)
    for row in jumpsArray:
        if any(cell != 0 for cell in row):
            row[index] += 1
            break
    return jumpsArray
    
jumpsArray = [[1,0,0,0,0,1],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0],
                    [0,0,0,0,0,0]]

j = update_jumps(jumpsArray, 2)
j = update_jumps(j, 2)
j2 = update_jumps_array(j)
print(j2)
